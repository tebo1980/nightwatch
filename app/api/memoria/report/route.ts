import { NextRequest, NextResponse } from 'next/server'
import { getIntelligenceSummary, getClientIntelligence } from '@/lib/memoria'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { clientId } = body

  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
  }

  // Get the client info
  const client = await prisma.agentClient.findUnique({ where: { id: clientId } })
  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  // Get the full intelligence summary
  const summary = await getIntelligenceSummary(clientId)

  // Get insight counts by category
  const insights = await getClientIntelligence(clientId)
  const categories: Record<string, number> = {}
  for (const ins of insights) {
    categories[ins.category] = (categories[ins.category] || 0) + 1
  }

  const highConfidence = insights.filter((i) => i.confidence === 'high').length
  const benchmarkInsights = insights.filter((i) => i.isBenchmark).length

  return NextResponse.json({
    client: {
      id: client.id,
      businessName: client.businessName,
      industry: client.industry,
      ownerName: client.ownerName,
    },
    totalInsights: insights.length,
    highConfidenceInsights: highConfidence,
    benchmarkInsights,
    categories,
    summary,
  })
}
