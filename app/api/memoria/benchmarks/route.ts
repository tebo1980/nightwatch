import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { benchmarkClient } from '@/lib/memoria'

export async function GET(req: NextRequest) {
  const tradeVertical = req.nextUrl.searchParams.get('tradeVertical')
  const metric = req.nextUrl.searchParams.get('metric') || undefined

  const where: Record<string, string> = {}
  if (tradeVertical) where.tradeVertical = tradeVertical
  if (metric) where.metric = metric

  const benchmarks = await prisma.verticalBenchmark.findMany({
    where,
    orderBy: { calculatedAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ benchmarks })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Two modes: store a benchmark or compare a client against one
  if (body.clientId && body.metric && body.value !== undefined && body.tradeVertical) {
    const result = await benchmarkClient(
      body.clientId,
      body.metric,
      body.value,
      body.tradeVertical
    )
    return NextResponse.json(result)
  }

  // Store a new benchmark directly
  const { tradeVertical, metric, metricValue, percentile, sampleSize, region } = body

  if (!tradeVertical || !metric || metricValue === undefined || !percentile || !sampleSize) {
    return NextResponse.json(
      { error: 'tradeVertical, metric, metricValue, percentile, and sampleSize are required' },
      { status: 400 }
    )
  }

  const benchmark = await prisma.verticalBenchmark.create({
    data: {
      tradeVertical,
      metric,
      metricValue,
      percentile,
      sampleSize,
      region: region || 'Louisville-Southern-Indiana',
    },
  })

  return NextResponse.json({ benchmark })
}
