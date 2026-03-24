import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClientIntelligence } from '@/lib/memoria'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      clientName, reportMonth, reportYear, tier,
      totalCallsThisMonth, totalCallsLastMonth,
      guaranteeCallsToDate, daysRemainingInGuarantee, topCallSource,
      facebookAdSpend, googleAdSpend, costPerCall, bestPerformingAd,
      healthScoreThisMonth, healthScoreLastMonth, weakestCategory,
      whatWorked, challenges, additionalNotes,
    } = body

    if (!clientName || !totalCallsThisMonth || !healthScoreThisMonth) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const callsThis = Number(totalCallsThisMonth)
    const callsLast = Number(totalCallsLastMonth) || 0
    const callChange = callsLast > 0
      ? `${callsThis > callsLast ? '+' : ''}${((callsThis - callsLast) / callsLast * 100).toFixed(0)}%`
      : 'N/A (no prior month)'

    let userPrompt = `Write a complete monthly performance report for ${clientName} covering ${reportMonth} ${reportYear}. They are on the BaraTrust ${tier} plan.

Total calls: ${callsThis}, last month: ${callsLast}, change: ${callChange}. Guarantee calls to date: ${guaranteeCallsToDate || 0} of 10. Days remaining: ${daysRemainingInGuarantee || 'N/A'}. Top source: ${topCallSource}.

Facebook spend: $${facebookAdSpend || 0}.${tier === 'Complete' && googleAdSpend ? ` Google spend: $${googleAdSpend}.` : ''} Cost per call: $${costPerCall || 0}.${bestPerformingAd ? ` Best performing ad: ${bestPerformingAd}.` : ''}

Health score this month: ${healthScoreThisMonth}, last month: ${healthScoreLastMonth || 'N/A'}. Weakest category: ${weakestCategory}.

What worked: ${whatWorked}.${challenges ? ` Challenges: ${challenges}.` : ''}${additionalNotes ? ` Additional notes: ${additionalNotes}.` : ''}

Write in four sections:
1) The Month in Plain English (2-3 sentences)
2) What Worked and Why (2-3 sentences)
3) What We're Adjusting (2-3 sentences)
4) Guarantee Status (honest, specific)

Close with the Health Score update and one warm personal sentence signed Todd. Under 450 words total.`

    // ─── Memoria: Add intelligence section if available ────────────
    try {
      const agentClient = await prisma.agentClient.findFirst({
        where: { businessName: { contains: clientName.split(' ')[0] } },
      })

      if (agentClient) {
        const insights = await getClientIntelligence(agentClient.id)
        if (insights.length > 0) {
          const topInsights = insights
            .filter((i) => i.confidence !== 'low')
            .slice(0, 3)

          if (topInsights.length > 0) {
            userPrompt += `\n\nAfter the main report, add a section called "Memoria Intelligence" with these top business insights we have gathered about this client:\n`
            for (const ins of topInsights) {
              userPrompt += `- [${ins.confidence.toUpperCase()}] ${ins.insight}\n`
            }
            userPrompt += `\nSummarize these insights in 2-3 plain English sentences that connect them to the report findings. Make them actionable.`
          }
        }
      }
    } catch {
      // Memoria data is optional — continue without it
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: "You are Todd Tebo, founder of BaraTrust, writing a monthly performance report for a local service business client. Your voice is warm, honest, plain spoken, conversational. Never use marketing jargon. Write like you're talking to a contractor at his kitchen table.",
      messages: [{ role: 'user', content: userPrompt }],
    })

    const report = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ success: true, report })
  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json({ error: 'Report generation failed' }, { status: 500 })
  }
}
