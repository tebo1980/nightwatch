import { prisma } from './prisma'
import type { VerticalBenchmark } from '@prisma/client'
import { recordInsight } from './memoria'

// ─── Standard metrics tracked across all trade verticals ────────────
const BENCHMARK_METRICS = [
  'monthly_call_volume',
  'cost_per_call',
  'review_rating_average',
  'review_response_rate',
  'monthly_revenue_estimate',
  'cogs_percentage',
  'lead_conversion_rate',
  'average_job_value',
] as const

export type BenchmarkMetric = (typeof BENCHMARK_METRICS)[number]

// ─── Helpers ────────────────────────────────────────────────────────

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function percentile25(values: number[]): number {
  if (values.length < 2) return values[0] ?? 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.floor(sorted.length * 0.25)
  return sorted[idx]
}

function percentile75(values: number[]): number {
  if (values.length < 2) return values[0] ?? 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.floor(sorted.length * 0.75)
  return sorted[idx]
}

function getPercentileLabel(value: number, q1: number, med: number, q3: number): string {
  if (value >= q3) return 'Top 25%'
  if (value >= med) return 'Above Median'
  if (value >= q1) return 'Below Median'
  return 'Bottom 25%'
}

// For metrics where lower is better (cost_per_call, cogs_percentage)
const LOWER_IS_BETTER: string[] = ['cost_per_call', 'cogs_percentage']

function getPercentileLabelDirectional(
  value: number,
  q1: number,
  med: number,
  q3: number,
  metric: string
): string {
  const lowerIsBetter = LOWER_IS_BETTER.includes(metric)
  if (lowerIsBetter) {
    // For costs: being below Q1 is GOOD
    if (value <= q1) return 'Top 25%'
    if (value <= med) return 'Above Median'
    if (value <= q3) return 'Below Median'
    return 'Bottom 25%'
  }
  // For revenue/ratings: being above Q3 is GOOD
  if (value >= q3) return 'Top 25%'
  if (value >= med) return 'Above Median'
  if (value >= q1) return 'Below Median'
  return 'Bottom 25%'
}

// ─── Extract numeric values from insight text for a given metric ────

function extractMetricValues(
  insights: { insight: string; clientId: string }[],
  metric: string
): { clientId: string; value: number }[] {
  const results: { clientId: string; value: number }[] = []
  const patterns: Record<string, RegExp[]> = {
    monthly_call_volume: [/(\d+)\s*calls?\s*(per|a|each)\s*month/i, /monthly\s*call\s*volume[:\s]*(\d+)/i, /call\s*volume[:\s]*(\d+)/i],
    cost_per_call: [/\$?([\d,.]+)\s*(per|a|each)\s*call/i, /cost\s*per\s*call[:\s]*\$?([\d,.]+)/i],
    review_rating_average: [/(\d+\.?\d*)\s*star/i, /rating[:\s]*(\d+\.?\d*)/i, /average\s*rating[:\s]*(\d+\.?\d*)/i, /review\s*rating[:\s]*(\d+\.?\d*)/i],
    review_response_rate: [/response\s*rate[:\s]*(\d+\.?\d*)%/i, /(\d+\.?\d*)%\s*response/i, /responds?\s*to\s*(\d+\.?\d*)%/i],
    monthly_revenue_estimate: [/\$?([\d,]+)\s*(per|a|each)\s*month/i, /monthly\s*revenue[:\s]*\$?([\d,]+)/i, /revenue[:\s]*\$?([\d,]+)\s*(per|a)\s*month/i],
    cogs_percentage: [/COGS[:\s]*(\d+\.?\d*)%/i, /cost\s*of\s*goods[:\s]*(\d+\.?\d*)%/i, /(\d+\.?\d*)%\s*COGS/i],
    lead_conversion_rate: [/conversion\s*rate[:\s]*(\d+\.?\d*)%/i, /(\d+\.?\d*)%\s*conversion/i, /convert\s*at\s*(\d+\.?\d*)%/i],
    average_job_value: [/\$?([\d,]+)\s*(per|a|each)\s*job/i, /average\s*job\s*value[:\s]*\$?([\d,]+)/i, /job\s*value[:\s]*\$?([\d,]+)/i, /average\s*ticket[:\s]*\$?([\d,]+)/i],
  }

  const metricPatterns = patterns[metric]
  if (!metricPatterns) return results

  for (const ins of insights) {
    for (const pattern of metricPatterns) {
      const match = ins.insight.match(pattern)
      if (match) {
        const raw = match[1].replace(/,/g, '')
        const val = parseFloat(raw)
        if (!isNaN(val) && val > 0) {
          results.push({ clientId: ins.clientId, value: val })
          break
        }
      }
    }
  }

  return results
}

// ─── Calculate benchmarks for a trade vertical ─────────────────────

export async function calculateVerticalBenchmarks(
  tradeVertical: string,
  region: string = 'Louisville-Southern-Indiana'
): Promise<VerticalBenchmark[]> {
  // Get all benchmark-eligible insights for this trade vertical
  const insights = await prisma.clientIntelligence.findMany({
    where: {
      tradeVertical,
      isActive: true,
    },
    select: { insight: true, clientId: true, category: true },
  })

  if (insights.length === 0) return []

  const createdBenchmarks: VerticalBenchmark[] = []

  for (const metric of BENCHMARK_METRICS) {
    const dataPoints = extractMetricValues(insights, metric)

    // Need at least 2 data points from different clients to create a benchmark
    const uniqueClients = new Set(dataPoints.map((d) => d.clientId))
    if (uniqueClients.size < 2) continue

    // Use the best value per client (most recent would be better, but insight text doesn't carry timestamps)
    const clientBest: Record<string, number> = {}
    for (const dp of dataPoints) {
      if (clientBest[dp.clientId] === undefined) {
        clientBest[dp.clientId] = dp.value
      }
    }
    const values = Object.values(clientBest)

    const med = median(values)
    const q1 = percentile25(values)
    const q3 = percentile75(values)

    // Delete old benchmarks for this metric/vertical before inserting new
    await prisma.verticalBenchmark.deleteMany({
      where: { tradeVertical, metric, region },
    })

    // Save median as main benchmark
    const bm = await prisma.verticalBenchmark.create({
      data: {
        tradeVertical,
        metric,
        metricValue: med,
        percentile: '50th',
        sampleSize: uniqueClients.size,
        region,
      },
    })

    // Save Q1 and Q3 as additional benchmarks
    await prisma.verticalBenchmark.create({
      data: {
        tradeVertical,
        metric,
        metricValue: q1,
        percentile: '25th',
        sampleSize: uniqueClients.size,
        region,
      },
    })

    await prisma.verticalBenchmark.create({
      data: {
        tradeVertical,
        metric,
        metricValue: q3,
        percentile: '75th',
        sampleSize: uniqueClients.size,
        region,
      },
    })

    createdBenchmarks.push(bm)
  }

  return createdBenchmarks
}

// ─── Get benchmark comparison for a specific client metric ──────────

export async function getClientBenchmark(
  clientId: string,
  metric: string,
  clientValue: number
): Promise<{
  percentile: string
  benchmarkMedian: number
  topQuartile: number
  bottomQuartile: number
  sampleSize: number
  insight: string
}> {
  // Find the client's trade vertical
  const client = await prisma.agentClient.findUnique({
    where: { id: clientId },
    select: { industry: true },
  })
  const tradeVertical = client?.industry || 'General'

  // Get all benchmark records for this metric and vertical
  const benchmarks = await prisma.verticalBenchmark.findMany({
    where: { tradeVertical, metric },
    orderBy: { calculatedAt: 'desc' },
  })

  // Group by percentile, take most recent of each
  const medianBm = benchmarks.find((b) => b.percentile === '50th')
  const q1Bm = benchmarks.find((b) => b.percentile === '25th')
  const q3Bm = benchmarks.find((b) => b.percentile === '75th')

  if (!medianBm) {
    return {
      percentile: 'N/A',
      benchmarkMedian: clientValue,
      topQuartile: clientValue,
      bottomQuartile: clientValue,
      sampleSize: 0,
      insight: `Not enough data to benchmark ${formatMetricName(metric)} for ${tradeVertical} businesses yet.`,
    }
  }

  const medVal = medianBm.metricValue
  const q1Val = q1Bm?.metricValue ?? medVal * 0.75
  const q3Val = q3Bm?.metricValue ?? medVal * 1.25
  const sampleSize = medianBm.sampleSize

  const percentileLabel = getPercentileLabelDirectional(clientValue, q1Val, medVal, q3Val, metric)
  const metricLabel = formatMetricName(metric)
  const verticalLabel = tradeVertical.toLowerCase()

  let insight: string
  if (percentileLabel === 'Top 25%') {
    insight = `You are in the top 25% of Louisville ${verticalLabel} businesses for ${metricLabel}. Your value of ${formatMetricValue(metric, clientValue)} compares to the median of ${formatMetricValue(metric, medVal)} across ${sampleSize} businesses.`
  } else if (percentileLabel === 'Above Median') {
    insight = `Your ${metricLabel} of ${formatMetricValue(metric, clientValue)} is above average for Louisville ${verticalLabel} businesses. The median is ${formatMetricValue(metric, medVal)}.`
  } else if (percentileLabel === 'Below Median') {
    insight = `Your ${metricLabel} of ${formatMetricValue(metric, clientValue)} is below average for Louisville ${verticalLabel} businesses. The median is ${formatMetricValue(metric, medVal)} — closing this gap is an opportunity.`
  } else {
    insight = `Your ${metricLabel} of ${formatMetricValue(metric, clientValue)} is in the bottom 25% of Louisville ${verticalLabel} businesses. The median is ${formatMetricValue(metric, medVal)} and top performers are at ${formatMetricValue(metric, q3Val)}. This needs attention.`
  }

  return {
    percentile: percentileLabel,
    benchmarkMedian: medVal,
    topQuartile: q3Val,
    bottomQuartile: q1Val,
    sampleSize,
    insight,
  }
}

// ─── Generate a full benchmark summary for a client ─────────────────

export async function generateBenchmarkSummary(
  clientId: string,
  tradeVertical: string
): Promise<string> {
  const benchmarks = await prisma.verticalBenchmark.findMany({
    where: { tradeVertical },
    orderBy: { calculatedAt: 'desc' },
  })

  if (benchmarks.length === 0) {
    return 'No vertical benchmarks available yet for this trade.'
  }

  // Get the client's insights to extract their metric values
  const clientInsights = await prisma.clientIntelligence.findMany({
    where: { clientId, isActive: true },
    select: { insight: true, clientId: true },
  })

  const lines: string[] = [
    `BENCHMARK COMPARISON: ${tradeVertical} businesses in Louisville-Southern Indiana`,
    '',
  ]

  // Group benchmarks by metric
  const byMetric: Record<string, VerticalBenchmark[]> = {}
  for (const bm of benchmarks) {
    if (!byMetric[bm.metric]) byMetric[bm.metric] = []
    byMetric[bm.metric].push(bm)
  }

  for (const [metric, bms] of Object.entries(byMetric)) {
    const medianBm = bms.find((b) => b.percentile === '50th')
    const q1Bm = bms.find((b) => b.percentile === '25th')
    const q3Bm = bms.find((b) => b.percentile === '75th')

    if (!medianBm) continue

    // Try to find client's value for this metric
    const clientDataPoints = extractMetricValues(clientInsights, metric)
    const clientValue = clientDataPoints.length > 0 ? clientDataPoints[0].value : null

    const metricLabel = formatMetricName(metric)
    let line = `• ${metricLabel}: Median=${formatMetricValue(metric, medianBm.metricValue)}`
    if (q1Bm) line += `, Bottom 25th=${formatMetricValue(metric, q1Bm.metricValue)}`
    if (q3Bm) line += `, Top 25th=${formatMetricValue(metric, q3Bm.metricValue)}`
    line += ` (${medianBm.sampleSize} businesses)`

    if (clientValue !== null) {
      const label = getPercentileLabelDirectional(
        clientValue,
        q1Bm?.metricValue ?? medianBm.metricValue * 0.75,
        medianBm.metricValue,
        q3Bm?.metricValue ?? medianBm.metricValue * 1.25,
        metric
      )
      line += ` → THIS CLIENT: ${formatMetricValue(metric, clientValue)} [${label}]`
    }

    lines.push(line)
  }

  return lines.join('\n')
}

// ─── Format helpers ─────────────────────────────────────────────────

function formatMetricName(metric: string): string {
  const names: Record<string, string> = {
    monthly_call_volume: 'Monthly Call Volume',
    cost_per_call: 'Cost per Call',
    review_rating_average: 'Review Rating',
    review_response_rate: 'Review Response Rate',
    monthly_revenue_estimate: 'Monthly Revenue',
    cogs_percentage: 'COGS %',
    lead_conversion_rate: 'Lead Conversion Rate',
    average_job_value: 'Average Job Value',
  }
  return names[metric] || metric.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatMetricValue(metric: string, value: number): string {
  if (['review_rating_average'].includes(metric)) {
    return `${value.toFixed(1)} stars`
  }
  if (['review_response_rate', 'cogs_percentage', 'lead_conversion_rate'].includes(metric)) {
    return `${value.toFixed(1)}%`
  }
  if (['cost_per_call', 'monthly_revenue_estimate', 'average_job_value'].includes(metric)) {
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  }
  if (['monthly_call_volume'].includes(metric)) {
    return `${Math.round(value)} calls`
  }
  return value.toLocaleString()
}

// ─── Auto-extract and benchmark numeric metrics from insight text ────

export async function autoBenchmarkInsight(
  clientId: string,
  insightText: string,
  tradeVertical: string
): Promise<void> {
  // Try to extract numeric metrics from the insight text
  for (const metric of BENCHMARK_METRICS) {
    const extracted = extractMetricValues(
      [{ insight: insightText, clientId }],
      metric
    )

    if (extracted.length > 0) {
      const value = extracted[0].value
      const comparison = await getClientBenchmark(clientId, metric, value)

      // If this client is in the bottom quartile, auto-generate a warning insight
      if (comparison.percentile === 'Bottom 25%' && comparison.sampleSize >= 2) {
        await recordInsight({
          clientId,
          category: 'benchmark',
          insight: comparison.insight,
          confidence: 'medium',
          source: 'benchmark-engine',
          tradeVertical,
          isBenchmark: true,
        })
      }
    }
  }
}

// ─── Export metrics list for UI ─────────────────────────────────────

export { BENCHMARK_METRICS, formatMetricName, formatMetricValue, LOWER_IS_BETTER }
