import { NextRequest, NextResponse } from 'next/server'
import { getIntelligenceSummary, getClientIntelligence } from '@/lib/memoria'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

let _anthropic: Anthropic | null = null
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic()
  return _anthropic
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clientId } = body

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    // 1. Load client
    const client = await prisma.agentClient.findUnique({ where: { id: clientId } })
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // 2. Load all active insights
    const insights = await getClientIntelligence(clientId)
    const categories: Record<string, number> = {}
    for (const ins of insights) {
      categories[ins.category] = (categories[ins.category] || 0) + 1
    }
    const highConfidence = insights.filter((i) => i.confidence === 'high').length
    const benchmarkInsights = insights.filter((i) => i.isBenchmark).length

    // 3. Load recent Cole expense data
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)
    let coleContext = ''
    try {
      const recentExpenses = await prisma.expenseEntry.findMany({
        where: { clientId, date: { gte: thirtyDaysAgo } },
        orderBy: { date: 'desc' },
        take: 20,
      })
      if (recentExpenses.length > 0) {
        const totalExpenses = recentExpenses.reduce((s, e) => s + e.amount, 0)
        coleContext = `\nRecent expense activity (last 30 days): $${totalExpenses.toFixed(0)} across ${recentExpenses.length} entries.`
      }
    } catch { /* Cole data may not exist for this client */ }

    // 4. Load recent Rex review data
    let rexContext = ''
    try {
      const recentReviews = await prisma.review.findMany({
        where: { clientId },
        orderBy: { reviewDate: 'desc' },
        take: 10,
      })
      if (recentReviews.length > 0) {
        const avgRating = recentReviews.reduce((s, r) => s + r.rating, 0) / recentReviews.length
        const responded = recentReviews.filter((r) => r.finalResponse || r.status === 'posted').length
        rexContext = `\nRecent review activity: ${recentReviews.length} reviews, avg ${avgRating.toFixed(1)} stars, ${responded} responded to.`
      }
    } catch { /* Rex data may not exist */ }

    // 5. Load recent Iris lead data
    let irisContext = ''
    try {
      const recentLeads = await prisma.irisLead.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
      if (recentLeads.length > 0) {
        const converted = recentLeads.filter((l) => l.status === 'converted').length
        irisContext = `\nRecent lead activity: ${recentLeads.length} leads tracked, ${converted} converted.`
      }
    } catch { /* Iris data may not exist */ }

    // 6. Build intelligence summary
    const intelligenceSummary = await getIntelligenceSummary(clientId)

    // If no insights exist, return the raw summary without calling Claude
    if (insights.length === 0) {
      return NextResponse.json({
        client: { id: client.id, businessName: client.businessName, industry: client.industry, ownerName: client.ownerName },
        totalInsights: 0,
        highConfidenceInsights: 0,
        benchmarkInsights: 0,
        categories,
        summary: intelligenceSummary,
        brief: null,
      })
    }

    // 7. Call Claude to generate the Intelligence Brief
    const systemPrompt = `You are BaraTrust Memoria, a business intelligence advisor for small trade and service businesses. You have been learning this specific business over time and have accumulated institutional knowledge about how it operates, what patterns it follows, and where its opportunities and risks are.

Your job is to generate a monthly Memoria Intelligence Brief — a strategic advisory report that tells the business owner not just what happened but what it means and what they should do about it.

Your voice is direct, warm, and specific. You speak like a trusted advisor who knows this business well — not a generic consultant. You reference specific patterns you have observed about this particular business. You make specific recommendations not vague suggestions.

Never say things like 'consider reviewing your data' or 'it may be worth exploring.' Say exactly what to do and why.`

    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    const userPrompt = `Generate a Memoria Intelligence Brief for ${client.businessName}, a ${client.industry} business in the Louisville and Southern Indiana market.

Here is everything I have learned about this business:

${intelligenceSummary}
${coleContext}${rexContext}${irisContext}

Current date: ${today}

Generate a Memoria Intelligence Brief with these sections:

1. What I Know About Your Business
Two to three sentences summarizing the most important patterns I have observed about this specific business. Reference specific numbers and timeframes.

2. This Month's Strategic Priorities
Three specific actions this business should take this month based on what I know. Each action should include what to do, why based on the data, and what outcome to expect.

3. Watch List
Two to three things I am monitoring that could become important. Early signals I am seeing that may require action in the next 30 to 60 days.

4. What I Am Learning
One insight about this business that I am still developing confidence in. Something I have started to notice but need more data to confirm.

5. One Question For You
One specific question for the business owner that would help me learn something important I do not yet know about their business.

Keep the entire brief under 500 words. Write in first person as Memoria. Make every sentence specific to this business not generic.`

    const message = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const brief = message.content[0].type === 'text' ? message.content[0].text : ''

    return NextResponse.json({
      client: { id: client.id, businessName: client.businessName, industry: client.industry, ownerName: client.ownerName },
      totalInsights: insights.length,
      highConfidenceInsights: highConfidence,
      benchmarkInsights,
      categories,
      summary: intelligenceSummary,
      brief,
    })
  } catch (error) {
    console.error('Memoria report error:', error)
    return NextResponse.json({ error: 'Report generation failed' }, { status: 500 })
  }
}
