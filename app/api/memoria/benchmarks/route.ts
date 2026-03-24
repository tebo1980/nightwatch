import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { benchmarkClient } from '@/lib/memoria'
import {
  calculateVerticalBenchmarks,
  getClientBenchmark,
  generateBenchmarkSummary,
  BENCHMARK_METRICS,
} from '@/lib/benchmarks'

export async function GET(req: NextRequest) {
  const tradeVertical = req.nextUrl.searchParams.get('tradeVertical')
  const metric = req.nextUrl.searchParams.get('metric') || undefined
  const clientId = req.nextUrl.searchParams.get('clientId')

  // Mode 1: Get benchmark comparison for a specific client across all metrics
  if (clientId) {
    try {
      const client = await prisma.agentClient.findUnique({
        where: { id: clientId },
        select: { industry: true },
      })
      const vertical = tradeVertical || client?.industry || 'General'

      const comparisons: Record<string, {
        percentile: string
        benchmarkMedian: number
        topQuartile: number
        bottomQuartile: number
        sampleSize: number
        clientValue: number | null
        insight: string
      }> = {}

      // Get client insights to extract their values
      const clientInsights = await prisma.clientIntelligence.findMany({
        where: { clientId, isActive: true },
        select: { insight: true, clientId: true },
      })

      for (const m of BENCHMARK_METRICS) {
        // Try to extract client value for this metric from their insights
        const patterns: Record<string, RegExp[]> = {
          monthly_call_volume: [/(\d+)\s*calls?\s*(per|a|each)\s*month/i, /monthly\s*call\s*volume[:\s]*(\d+)/i],
          cost_per_call: [/\$?([\d,.]+)\s*(per|a|each)\s*call/i, /cost\s*per\s*call[:\s]*\$?([\d,.]+)/i],
          review_rating_average: [/(\d+\.?\d*)\s*star/i, /rating[:\s]*(\d+\.?\d*)/i],
          review_response_rate: [/response\s*rate[:\s]*(\d+\.?\d*)%/i, /(\d+\.?\d*)%\s*response/i],
          monthly_revenue_estimate: [/\$?([\d,]+)\s*(per|a|each)\s*month/i, /monthly\s*revenue[:\s]*\$?([\d,]+)/i],
          cogs_percentage: [/COGS[:\s]*(\d+\.?\d*)%/i, /cost\s*of\s*goods[:\s]*(\d+\.?\d*)%/i],
          lead_conversion_rate: [/conversion\s*rate[:\s]*(\d+\.?\d*)%/i, /(\d+\.?\d*)%\s*conversion/i],
          average_job_value: [/\$?([\d,]+)\s*(per|a|each)\s*job/i, /average\s*job\s*value[:\s]*\$?([\d,]+)/i],
        }

        let clientValue: number | null = null
        const metricPatterns = patterns[m]
        if (metricPatterns) {
          for (const ins of clientInsights) {
            for (const pattern of metricPatterns) {
              const match = ins.insight.match(pattern)
              if (match) {
                const raw = match[1].replace(/,/g, '')
                const val = parseFloat(raw)
                if (!isNaN(val) && val > 0) {
                  clientValue = val
                  break
                }
              }
            }
            if (clientValue !== null) break
          }
        }

        if (clientValue !== null) {
          const result = await getClientBenchmark(clientId, m, clientValue)
          comparisons[m] = { ...result, clientValue }
        } else {
          // Still return benchmark ranges even if client value is unknown
          const benchmarks = await prisma.verticalBenchmark.findMany({
            where: { tradeVertical: vertical, metric: m },
            orderBy: { calculatedAt: 'desc' },
          })
          const medianBm = benchmarks.find((b) => b.percentile === '50th')
          const q1Bm = benchmarks.find((b) => b.percentile === '25th')
          const q3Bm = benchmarks.find((b) => b.percentile === '75th')
          if (medianBm) {
            comparisons[m] = {
              percentile: 'N/A',
              benchmarkMedian: medianBm.metricValue,
              topQuartile: q3Bm?.metricValue ?? medianBm.metricValue * 1.25,
              bottomQuartile: q1Bm?.metricValue ?? medianBm.metricValue * 0.75,
              sampleSize: medianBm.sampleSize,
              clientValue: null,
              insight: `No data available for this client on this metric.`,
            }
          }
        }
      }

      return NextResponse.json({ comparisons, tradeVertical: vertical })
    } catch (error) {
      console.error('Benchmark comparison error:', error)
      return NextResponse.json({ error: 'Failed to generate comparisons' }, { status: 500 })
    }
  }

  // Mode 2: List all benchmarks
  const where: Record<string, string> = {}
  if (tradeVertical) where.tradeVertical = tradeVertical
  if (metric) where.metric = metric

  const benchmarks = await prisma.verticalBenchmark.findMany({
    where,
    orderBy: { calculatedAt: 'desc' },
    take: 200,
  })

  return NextResponse.json({ benchmarks })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Mode 1: Recalculate all benchmarks from client data
    if (body.recalculate) {
      // Find all unique trade verticals from client intelligence
      const verticals = await prisma.clientIntelligence.findMany({
        where: { isActive: true, tradeVertical: { not: null } },
        select: { tradeVertical: true },
        distinct: ['tradeVertical'],
      })

      // Also pull from AgentClient industries
      const clientVerticals = await prisma.agentClient.findMany({
        where: { active: true },
        select: { industry: true },
        distinct: ['industry'],
      })

      const allVerticals = new Set<string>()
      for (const v of verticals) {
        if (v.tradeVertical) allVerticals.add(v.tradeVertical)
      }
      for (const c of clientVerticals) {
        if (c.industry) allVerticals.add(c.industry)
      }

      const results: { vertical: string; benchmarks: number }[] = []
      for (const vertical of allVerticals) {
        const created = await calculateVerticalBenchmarks(vertical)
        results.push({ vertical, benchmarks: created.length })
      }

      return NextResponse.json({ recalculated: true, results })
    }

    // Mode 2: Compare a client against benchmarks (legacy)
    if (body.clientId && body.metric && body.value !== undefined && body.tradeVertical) {
      const result = await benchmarkClient(
        body.clientId,
        body.metric,
        body.value,
        body.tradeVertical
      )
      return NextResponse.json(result)
    }

    // Mode 3: Get benchmark summary for a client
    if (body.clientId && body.generateSummary) {
      const client = await prisma.agentClient.findUnique({
        where: { id: body.clientId },
        select: { industry: true },
      })
      const tradeVertical = body.tradeVertical || client?.industry || 'General'
      const summary = await generateBenchmarkSummary(body.clientId, tradeVertical)
      return NextResponse.json({ summary })
    }

    // Mode 4: Store a new benchmark directly
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
  } catch (error) {
    console.error('Benchmark API error:', error)
    return NextResponse.json({ error: 'Benchmark operation failed' }, { status: 500 })
  }
}
