import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recordInsight } from '@/lib/memoria'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { clientId, month, year } = await req.json()
    if (!clientId || month === undefined || !year) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const client = await prisma.agentClient.findUnique({ where: { id: clientId } })
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const startDate = new Date(Number(year), Number(month), 1)
    const endDate = new Date(Number(year), Number(month) + 1, 1)

    const vehicles = await prisma.flynnVehicle.findMany({
      where: { clientId },
      include: {
        fuelLogs: { where: { date: { gte: startDate, lt: endDate } } },
        maintenanceLogs: { where: { date: { gte: startDate, lt: endDate } } },
      },
    })

    if (vehicles.length === 0) {
      return NextResponse.json({ error: 'No vehicles found for this client' }, { status: 404 })
    }

    const vehicleData = vehicles.map((v) => {
      const fuelCost = v.fuelLogs.reduce((sum, f) => sum + f.totalCost, 0)
      const gallons = v.fuelLogs.reduce((sum, f) => sum + f.gallons, 0)
      const maintCost = v.maintenanceLogs.reduce((sum, m) => sum + m.cost, 0)
      const services = v.maintenanceLogs.map((m) => m.type).join(', ') || 'None'
      const overdue = v.maintenanceLogs.filter((m) => m.nextDueMileage && v.currentMileage >= m.nextDueMileage)

      return {
        name: v.vehicleName, year: v.year, make: v.make, model: v.model,
        fuelCost, gallons, maintCost, services,
        total: fuelCost + maintCost,
        overdue: overdue.map((m) => ({ type: m.type, dueMileage: m.nextDueMileage, currentMileage: v.currentMileage })),
      }
    })

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

    const systemPrompt = `You are Flynn, BaraTrust's fleet intelligence agent. You analyze vehicle cost data for local service businesses and generate plain-English fleet reports that help business owners understand what their vehicles are actually costing them per job and per mile. Your voice matches Todd's — warm, direct, no jargon, like a conversation with a knowledgeable friend. Never be overly formal.`

    const userPrompt = `Generate a fleet cost report for ${client.businessName} for ${monthNames[Number(month)]} ${year}.

Vehicle data:
${vehicleData.map((v) => `
Vehicle: ${v.name} (${v.year} ${v.make} ${v.model})
Fuel this month: $${v.fuelCost.toFixed(2)} (${v.gallons.toFixed(1)} gallons)
Maintenance this month: $${v.maintCost.toFixed(2)} (${v.services})
Combined cost this month: $${v.total.toFixed(2)}
${v.overdue.length > 0 ? v.overdue.map((o) => `Warning: This vehicle is overdue for ${o.type} at ${o.currentMileage} miles (due at ${o.dueMileage})`).join('\n') : ''}`).join('\n')}

Write a fleet report with:
1. A plain-English summary of total fleet costs this month.
2. A note on each vehicle — what it cost, whether it's on track or showing cost increases.
3. Any maintenance alerts in plain language.
4. One recommendation for fleet cost management this month.

Keep the report under 300 words. Sound like a trusted advisor, not an accountant.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const report = message.content[0].type === 'text' ? message.content[0].text : ''

    // ─── Memoria: Flynn fleet insights ────────────────────────────
    try {
      for (const v of vehicleData) {
        // Cost per mile check (estimate based on fuel + maint vs rough mileage)
        // If total monthly cost is high relative to typical service vehicle usage
        if (v.gallons > 0) {
          const estimatedMiles = v.gallons * 20 // ~20 mpg estimate for service vehicles
          const costPerMile = estimatedMiles > 0 ? v.total / estimatedMiles : 0
          if (costPerMile > 0.65) {
            await recordInsight({
              clientId,
              category: 'operations',
              insight: `Vehicle ${v.name} (${v.year} ${v.make} ${v.model}) is running at approximately $${costPerMile.toFixed(2)}/mile — above the $0.65 efficiency threshold. Review maintenance schedule and fuel efficiency.`,
              confidence: 'medium',
              source: 'Flynn',
              tradeVertical: client.industry,
            })
          }
        }

        // Overdue maintenance
        if (v.overdue.length > 0) {
          for (const o of v.overdue) {
            await recordInsight({
              clientId,
              category: 'operations',
              insight: `Vehicle ${v.name} is overdue for ${o.type} service — current mileage ${o.currentMileage.toLocaleString()} exceeds due mileage of ${o.dueMileage?.toLocaleString()}. Deferred maintenance increases breakdown risk and repair costs.`,
              confidence: 'high',
              source: 'Flynn',
              tradeVertical: client.industry,
            })
          }
        }
      }
    } catch (memoriaErr) {
      console.error('Flynn Memoria insight error:', memoriaErr)
    }

    return NextResponse.json({ success: true, report, vehicleData })
  } catch (error) {
    console.error('Flynn report error:', error)
    return NextResponse.json({ error: 'Report generation failed' }, { status: 500 })
  }
}
