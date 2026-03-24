import { NextRequest, NextResponse } from 'next/server'
import { recordInsight, getClientIntelligence } from '@/lib/memoria'

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId')
  const category = req.nextUrl.searchParams.get('category') || undefined

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
