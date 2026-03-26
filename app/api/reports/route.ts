import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

let _anthropic: Anthropic | null = null
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic()
  return _anthropic
}

// GET — Load client data + report history
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

  try {
    const client = await prisma.agentClient.findUnique({
      where: { id: clientId },
      select: {
        id: true, businessName: true, industry: true, ownerName: true, ownerFirstName: true,
        tier: true, city: true, state: true,
        novaEnabled: true, rexEnabled: true, irisEnabled: true, maxEnabled: true,
        dellaEnabled: true, sageEnabled: true, flynnEnabled: true, coleEnabled: true,
        riverEnabled: true, atlasEnabled: true, memoriaEnabled: true,
      },
    })
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const reports = await prisma.monthlyReport.findMany({
      where: { clientId },
      orderBy: [{ reportYear: 'desc' }, { reportMonth: 'desc' }],
      select: { id: true, reportMonth: true, reportYear: true, reportText: true, generatedAt: true },
    })

    return NextResponse.json({ client, reports })
  } catch (error) {
    console.error('Reports GET error:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // ─── Generate report ──────────────────────────────────────
    if (body.action === 'generate') {
      const {
        clientName, ownerFirstName, trade, tier, city,
        totalCalls, lastMonthCalls, guaranteeCalls, guaranteeDaysLeft, topCallSource,
        fbSpend, googleSpend, costPerCall, bestAd,
        healthScore, lastHealthScore, weakestCategory,
        agentSummaries, whatWorked, challenges, specific,
      } = body

      const systemPrompt = `You are Todd Tebo, founder of BaraTrust, writing a monthly performance report for a local service business client. Your voice is warm, honest, plain spoken, and conversational. You never use marketing jargon. You explain things like you are talking to a contractor at his kitchen table. You are direct, encouraging, and always honest even when results are mixed. You reference the AI agents by name when summarizing their activity because clients love knowing their agents are working.`

      const agentLines = (agentSummaries || [])
        .filter((s: { name: string; summary: string }) => s.summary?.trim())
        .map((s: { name: string; summary: string }) => `${s.name}: ${s.summary}`)
        .join('\n')

      const userPrompt = `Write a complete monthly report for ${clientName} (${ownerFirstName}), a ${trade} in ${city || 'Louisville'} on the ${tier} plan.

CALL PERFORMANCE:
- Total calls this month: ${totalCalls || 'not provided'}
- Total calls last month: ${lastMonthCalls || 'not provided'}
- Guarantee calls to date: ${guaranteeCalls || 'N/A'} out of 10
- Days remaining in guarantee: ${guaranteeDaysLeft || 'N/A'}
- Top call source: ${topCallSource || 'not specified'}

AD PERFORMANCE:
- Facebook ad spend: ${fbSpend ? '$' + fbSpend : 'none'}
- Google ad spend: ${googleSpend ? '$' + googleSpend : 'none'}
- Cost per call: ${costPerCall ? '$' + costPerCall : 'not calculated'}
${bestAd ? `- Best performing ad: ${bestAd}` : ''}

BUSINESS HEALTH SCORE:
- This month: ${healthScore || 'N/A'}/100
- Last month: ${lastHealthScore || 'N/A'}/100
- Weakest category: ${weakestCategory || 'not specified'}

AGENT ACTIVITY:
${agentLines || 'No agent activity summaries provided.'}

CONTEXT:
${whatWorked ? `What worked well: ${whatWorked}` : ''}
${challenges ? `Challenges: ${challenges}` : ''}
${specific ? `Include: ${specific}` : ''}

Write a complete monthly report with these sections:
1. Plain English summary of the month (2-3 sentences)
2. What worked and why
3. Agent activity highlights — mention each agent by name
4. What is changing next month and why
5. Honest guarantee status update
6. Business Health Score update with one focus area
7. Warm personal closing signed Todd`

      const message = await getAnthropic().messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      })

      const reportText = message.content[0].type === 'text' ? message.content[0].text : ''
      return NextResponse.json({ reportText })
    }

    // ─── Save report ──────────────────────────────────────────
    if (body.action === 'save') {
      const { clientId, reportMonth, reportYear, reportText } = body
      if (!clientId || !reportMonth || !reportYear || !reportText) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      const report = await prisma.monthlyReport.upsert({
        where: { clientId_reportMonth_reportYear: { clientId, reportMonth: parseInt(reportMonth), reportYear: parseInt(reportYear) } },
        update: { reportText, generatedAt: new Date() },
        create: { clientId, reportMonth: parseInt(reportMonth), reportYear: parseInt(reportYear), reportText },
      })

      return NextResponse.json({ report })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Reports POST error:', error)
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
  }
}
