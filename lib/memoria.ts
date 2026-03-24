import { prisma } from './prisma'
import type { ClientIntelligence } from '@prisma/client'

// Lazy import to avoid circular dependency — benchmarks imports memoria
let _autoBenchmarkInsight: ((clientId: string, insightText: string, tradeVertical: string) => Promise<void>) | null = null
async function getAutoBenchmark() {
  if (!_autoBenchmarkInsight) {
    const mod = await import('./benchmarks')
    _autoBenchmarkInsight = mod.autoBenchmarkInsight
  }
  return _autoBenchmarkInsight
}

// ─── Confidence auto-upgrade based on data points ────────────────────
function confidenceFromDataPoints(dataPoints: number): 'low' | 'medium' | 'high' {
  if (dataPoints >= 6) return 'high'
  if (dataPoints >= 3) return 'medium'
  return 'low'
}

// ─── Write a new insight or strengthen an existing one ───────────────
export async function recordInsight(params: {
  clientId: string
  category: string
  insight: string
  confidence: 'low' | 'medium' | 'high'
  source: string
  tradeVertical?: string
  isBenchmark?: boolean
}): Promise<ClientIntelligence> {
  // Check for a similar existing insight (same client + category + similar text)
  const existing = await prisma.clientIntelligence.findFirst({
    where: {
      clientId: params.clientId,
      category: params.category,
      insight: { contains: params.insight.substring(0, 60) },
      isActive: true,
    },
  })

  if (existing) {
    const newDataPoints = existing.dataPoints + 1
    return prisma.clientIntelligence.update({
      where: { id: existing.id },
      data: {
        dataPoints: newDataPoints,
        confidence: confidenceFromDataPoints(newDataPoints),
        lastConfirmed: new Date(),
        source: params.source,
      },
    })
  }

  const created = await prisma.clientIntelligence.create({
    data: {
      clientId: params.clientId,
      category: params.category,
      insight: params.insight,
      confidence: params.confidence,
      source: params.source,
      tradeVertical: params.tradeVertical,
      isBenchmark: params.isBenchmark ?? false,
    },
  })

  // Auto-benchmark: if this insight contains numeric metrics and has a trade vertical,
  // compare against vertical benchmarks. Skip if this IS a benchmark insight to avoid loops.
  if (params.tradeVertical && !params.isBenchmark && params.source !== 'benchmark-engine') {
    try {
      const autoBenchmark = await getAutoBenchmark()
      await autoBenchmark(params.clientId, params.insight, params.tradeVertical)
    } catch {
      // Benchmarking is non-critical — don't fail the insight recording
    }
  }

  return created
}

// ─── Get all active insights for a client ────────────────────────────
export async function getClientIntelligence(
  clientId: string,
  category?: string
): Promise<ClientIntelligence[]> {
  return prisma.clientIntelligence.findMany({
    where: {
      clientId,
      isActive: true,
      ...(category ? { category } : {}),
    },
    orderBy: [{ confidence: 'desc' }, { dataPoints: 'desc' }, { lastConfirmed: 'desc' }],
  })
}

// ─── Strengthen an existing insight when confirmed again ─────────────
export async function confirmInsight(insightId: string): Promise<ClientIntelligence> {
  const insight = await prisma.clientIntelligence.findUniqueOrThrow({
    where: { id: insightId },
  })

  const newDataPoints = insight.dataPoints + 1
  return prisma.clientIntelligence.update({
    where: { id: insightId },
    data: {
      dataPoints: newDataPoints,
      confidence: confidenceFromDataPoints(newDataPoints),
      lastConfirmed: new Date(),
    },
  })
}

// ─── Full intelligence summary as plain text for Claude reports ──────
export async function getIntelligenceSummary(clientId: string): Promise<string> {
  const insights = await getClientIntelligence(clientId)

  if (insights.length === 0) {
    return 'No intelligence gathered for this client yet.'
  }

  // Group insights by category
  const grouped: Record<string, ClientIntelligence[]> = {}
  for (const ins of insights) {
    if (!grouped[ins.category]) grouped[ins.category] = []
    grouped[ins.category].push(ins)
  }

  const lines: string[] = ['CLIENT INTELLIGENCE SUMMARY', '']

  for (const [category, items] of Object.entries(grouped)) {
    lines.push(`## ${category.toUpperCase()}`)
    for (const item of items) {
      const conf = item.confidence.toUpperCase()
      const pts = item.dataPoints
      const benchmark = item.isBenchmark ? ' [BENCHMARK]' : ''
      lines.push(`- [${conf}] (${pts} observations) ${item.insight}${benchmark}`)
      if (item.actionTaken) {
        lines.push(`  → Action: ${item.actionTaken}`)
      }
    }
    lines.push('')
  }

  return lines.join('\n')
}

// ─── Compare a client metric against vertical benchmarks ─────────────
export async function benchmarkClient(
  clientId: string,
  metric: string,
  value: number,
  tradeVertical: string
): Promise<{ percentile: string; benchmark: number; insight: string }> {
  const benchmarks = await prisma.verticalBenchmark.findMany({
    where: { tradeVertical, metric },
    orderBy: { calculatedAt: 'desc' },
    take: 1,
  })

  if (benchmarks.length === 0) {
    // No benchmarks yet — record as first data point
    await prisma.verticalBenchmark.create({
      data: {
        tradeVertical,
        metric,
        metricValue: value,
        percentile: '50th',
        sampleSize: 1,
      },
    })

    return {
      percentile: 'N/A',
      benchmark: value,
      insight: `First data point for ${metric} in ${tradeVertical}. More data needed for comparison.`,
    }
  }

  const bm = benchmarks[0]
  const diff = ((value - bm.metricValue) / bm.metricValue) * 100
  let percentile: string
  let insight: string

  if (diff >= 25) {
    percentile = 'Top 10%'
    insight = `Significantly above the ${tradeVertical} benchmark for ${metric} (+${diff.toFixed(1)}%).`
  } else if (diff >= 10) {
    percentile = 'Top 25%'
    insight = `Above average for ${tradeVertical} ${metric} (+${diff.toFixed(1)}%).`
  } else if (diff >= -10) {
    percentile = '50th'
    insight = `On par with the ${tradeVertical} average for ${metric}.`
  } else if (diff >= -25) {
    percentile = 'Bottom 25%'
    insight = `Below average for ${tradeVertical} ${metric} (${diff.toFixed(1)}%). Room for improvement.`
  } else {
    percentile = 'Bottom 10%'
    insight = `Significantly below the ${tradeVertical} benchmark for ${metric} (${diff.toFixed(1)}%). Needs attention.`
  }

  // Record this comparison as an insight
  await recordInsight({
    clientId,
    category: 'benchmark',
    insight,
    confidence: 'medium',
    source: 'benchmark-engine',
    tradeVertical,
    isBenchmark: true,
  })

  return { percentile, benchmark: bm.metricValue, insight }
}
