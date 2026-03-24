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

    const [expenses, jobs] = await Promise.all([
      prisma.expenseEntry.findMany({ where: { clientId, date: { gte: startDate, lt: endDate } } }),
      prisma.jobRevenue.findMany({ where: { clientId, date: { gte: startDate, lt: endDate } } }),
    ])

    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
    const totalRevenue = jobs.reduce((s, j) => s + j.revenue, 0)
    const jobCount = jobs.length
    const avgJobValue = jobCount > 0 ? totalRevenue / jobCount : 0
    const cogsPercent = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0
    const margin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0

    // By category
    const byCategory: Record<string, number> = {}
    expenses.forEach((e) => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount })

    // By vendor (top 5)
    const byVendor: Record<string, number> = {}
    expenses.forEach((e) => { byVendor[e.vendor] = (byVendor[e.vendor] || 0) + e.amount })
    const topVendors = Object.entries(byVendor).sort((a, b) => b[1] - a[1]).slice(0, 5)

    // Vendor spike detection vs last month
    const prevStart = new Date(Number(year), Number(month) - 1, 1)
    const prevExpenses = await prisma.expenseEntry.findMany({ where: { clientId, date: { gte: prevStart, lt: startDate } } })
    const prevByVendor: Record<string, number> = {}
    prevExpenses.forEach((e) => { prevByVendor[e.vendor] = (prevByVendor[e.vendor] || 0) + e.amount })
    const vendorSpikes = topVendors.filter(([v, amt]) => {
      const prev = prevByVendor[v]
      return prev && amt > prev * 1.15
    }).map(([v, amt]) => ({ vendor: v, current: amt, previous: prevByVendor[v] }))

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

    const systemPrompt = `You are Cole, BaraTrust's cost intelligence agent. You analyze expense and revenue data for local service businesses and write plain-English reports that help owners understand their true job profitability. You sound like Todd — direct, warm, honest, and focused on what actually matters: is this business making money on its jobs? You are not an accountant. You are a business partner who happens to understand numbers.`

    const userPrompt = `Generate a cost intelligence report for ${client.businessName} for ${monthNames[Number(month)]} ${year}.

Revenue this month: $${totalRevenue.toFixed(2)} across ${jobCount} jobs.
Average job value: $${avgJobValue.toFixed(2)}

Total expenses: $${totalExpenses.toFixed(2)}
Cost of goods as % of revenue: ${cogsPercent.toFixed(1)}%

Expenses by category:
${Object.entries(byCategory).map(([c, a]) => `  ${c}: $${a.toFixed(2)}`).join('\n')}

Top vendors by spend:
${topVendors.map(([v, a]) => `  ${v}: $${a.toFixed(2)}`).join('\n')}

${vendorSpikes.length > 0 ? `Vendor cost spikes vs last month:\n${vendorSpikes.map((s) => `  ${s.vendor}: $${s.previous.toFixed(2)} → $${s.current.toFixed(2)} (+${(((s.current - s.previous) / s.previous) * 100).toFixed(0)}%)`).join('\n')}` : ''}

Write a cost report with:
1. A plain-English summary of the month's cost picture.
2. Whether the COGS % is healthy for their business type (under 40% is generally good for contractors).
3. Any vendor cost spikes worth watching.
4. One specific recommendation to improve job profitability.

Keep it under 350 words. Talk to them like a partner, not a CPA.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const report = message.content[0].type === 'text' ? message.content[0].text : ''

    // ─── Memoria: Cole cost intelligence insights ──────────────────
    try {
      // Check for expense category increases >15% MoM
      const prevByCategory: Record<string, number> = {}
      prevExpenses.forEach((e) => { prevByCategory[e.category] = (prevByCategory[e.category] || 0) + e.amount })

      for (const [cat, amount] of Object.entries(byCategory)) {
        const prevAmount = prevByCategory[cat]
        if (prevAmount && amount > prevAmount * 1.15) {
          const pctIncrease = (((amount - prevAmount) / prevAmount) * 100).toFixed(0)
          await recordInsight({
            clientId,
            category: 'operations',
            insight: `${cat} expenses increased ${pctIncrease}% month over month ($${prevAmount.toFixed(0)} to $${amount.toFixed(0)}). Review whether this reflects scope growth or cost creep.`,
            confidence: 'medium',
            source: 'Cole',
            tradeVertical: client.industry,
          })
        }
      }

      // COGS exceeds 40%
      if (cogsPercent > 40 && totalRevenue > 0) {
        await recordInsight({
          clientId,
          category: 'revenue',
          insight: `Cost of goods sold is ${cogsPercent.toFixed(1)}% of revenue — above the 40% healthy threshold for contractors. Gross margin is only ${margin.toFixed(1)}%.`,
          confidence: 'high',
          source: 'Cole',
          tradeVertical: client.industry,
        })
      }

      // Vendor price increases >10%
      for (const spike of vendorSpikes) {
        const pctIncrease = (((spike.current - spike.previous) / spike.previous) * 100).toFixed(0)
        if (Number(pctIncrease) >= 10) {
          await recordInsight({
            clientId,
            category: 'operations',
            insight: `Vendor ${spike.vendor} increased ${pctIncrease}% month over month ($${spike.previous.toFixed(0)} to $${spike.current.toFixed(0)}). Consider negotiating or sourcing alternatives.`,
            confidence: 'medium',
            source: 'Cole',
            tradeVertical: client.industry,
          })
        }
      }
    } catch (memoriaErr) {
      console.error('Cole Memoria insight error:', memoriaErr)
    }

    return NextResponse.json({
      success: true, report,
      stats: { totalRevenue, totalExpenses, jobCount, avgJobValue, cogsPercent, margin, vendorSpikes },
    })
  } catch (error) {
    console.error('Cole report error:', error)
    return NextResponse.json({ error: 'Report generation failed' }, { status: 500 })
  }
}
