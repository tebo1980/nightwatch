import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET — Load tracker + performance for a client
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

  try {
    const client = await prisma.agentClient.findUnique({
      where: { id: clientId },
      select: { id: true, businessName: true, industry: true, ownerName: true, city: true, state: true },
    })
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    let tracker = await prisma.lsaTracker.findUnique({ where: { clientId } })
    if (!tracker) {
      tracker = await prisma.lsaTracker.create({ data: { clientId } })
    }

    const performance = await prisma.lsaPerformance.findMany({
      where: { clientId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })

    return NextResponse.json({ client, tracker, performance })
  } catch (error) {
    console.error('LSA GET error:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // ─── Update tracker checklist/status ───────────────────────
    if (body.action === 'update_tracker') {
      const { clientId, ...fields } = body
      if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

      // Remove action from fields
      delete fields.action

      const tracker = await prisma.lsaTracker.upsert({
        where: { clientId },
        update: fields,
        create: { clientId, ...fields },
      })
      return NextResponse.json({ tracker })
    }

    // ─── Save performance entry ───────────────────────────────
    if (body.action === 'save_performance') {
      const { clientId, month, year, ...data } = body
      if (!clientId || !month || !year) return NextResponse.json({ error: 'clientId, month, year required' }, { status: 400 })

      delete data.action
      const m = parseInt(month)
      const y = parseInt(year)

      const entry = await prisma.lsaPerformance.upsert({
        where: { clientId_month_year: { clientId, month: m, year: y } },
        update: { ...data, leadsReceived: parseInt(data.leadsReceived) || 0, leadsDisputed: parseInt(data.leadsDisputed) || 0, leadsApproved: parseInt(data.leadsApproved) || 0, jobsBooked: parseInt(data.jobsBooked) || 0, totalSpend: data.totalSpend ? parseFloat(data.totalSpend) : null, costPerLead: data.costPerLead ? parseFloat(data.costPerLead) : null, weeklyBudget: data.weeklyBudget ? parseFloat(data.weeklyBudget) : null, revenueGenerated: data.revenueGenerated ? parseFloat(data.revenueGenerated) : null, notes: data.notes || null },
        create: { clientId, month: m, year: y, leadsReceived: parseInt(data.leadsReceived) || 0, leadsDisputed: parseInt(data.leadsDisputed) || 0, leadsApproved: parseInt(data.leadsApproved) || 0, jobsBooked: parseInt(data.jobsBooked) || 0, totalSpend: data.totalSpend ? parseFloat(data.totalSpend) : null, costPerLead: data.costPerLead ? parseFloat(data.costPerLead) : null, weeklyBudget: data.weeklyBudget ? parseFloat(data.weeklyBudget) : null, revenueGenerated: data.revenueGenerated ? parseFloat(data.revenueGenerated) : null, notes: data.notes || null },
      })
      return NextResponse.json({ entry })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('LSA POST error:', error)
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
  }
}
