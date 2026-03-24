import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recordInsight, getClientIntelligence } from '@/lib/memoria'

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId')
  const category = req.nextUrl.searchParams.get('category') || undefined
  const allAgentStats = req.nextUrl.searchParams.get('allAgentStats')

  // Agent contribution stats for the Settings tab
  if (allAgentStats === 'true') {
    const allInsights = await prisma.clientIntelligence.findMany({
      where: { isActive: true },
      select: { source: true, lastConfirmed: true },
    })

    const agents = ['rex', 'iris', 'max', 'della', 'sage', 'flynn', 'cole', 'river', 'atlas', 'bolt']
    const agentStats: Record<string, { lastInsight: string | null; totalInsights: number }> = {}

    for (const agent of agents) {
      const matching = allInsights.filter((i) => i.source.toLowerCase().includes(agent))
      agentStats[agent] = {
        totalInsights: matching.length,
        lastInsight: matching.length > 0
          ? matching.reduce((latest, i) => (i.lastConfirmed > latest ? i.lastConfirmed : latest), matching[0].lastConfirmed).toISOString()
          : null,
      }
    }

    // Also include data-intake as a general source
    const intakeInsights = allInsights.filter((i) => i.source.includes('data-intake'))
    agentStats['data-intake'] = {
      totalInsights: intakeInsights.length,
      lastInsight: intakeInsights.length > 0
        ? intakeInsights.reduce((latest, i) => (i.lastConfirmed > latest ? i.lastConfirmed : latest), intakeInsights[0].lastConfirmed).toISOString()
        : null,
    }

    return NextResponse.json({ agentStats })
  }

  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
  }

  const insights = await getClientIntelligence(clientId, category)
  return NextResponse.json({ insights })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { clientId, category, insight, confidence, source, tradeVertical, isBenchmark } = body

  if (!clientId || !category || !insight || !source) {
    return NextResponse.json(
      { error: 'clientId, category, insight, and source are required' },
      { status: 400 }
    )
  }

  const result = await recordInsight({
    clientId,
    category,
    insight,
    confidence: confidence || 'low',
    source,
    tradeVertical,
    isBenchmark,
  })

  return NextResponse.json({ insight: result })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { insightId, isActive } = body

  if (!insightId) {
    return NextResponse.json({ error: 'insightId is required' }, { status: 400 })
  }

  const updated = await prisma.clientIntelligence.update({
    where: { id: insightId },
    data: { isActive: isActive ?? false },
  })

  return NextResponse.json({ insight: updated })
}
