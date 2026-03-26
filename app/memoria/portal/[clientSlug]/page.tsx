'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

// ─── Types ──────────────────────────────────────────────────────────

interface PortalClient {
  id: string
  businessName: string
  industry: string
  ownerName: string
  ownerFirstName: string
  city: string
  state: string
  intakeCompleted: boolean
  memoriaGoals: string | null
}

interface Insight {
  id: string
  category: string
  insight: string
  confidence: string
  dataPoints: number
  lastConfirmed: string
  source: string
  isBenchmark: boolean
}

interface BenchmarkComparison {
  percentile: string
  benchmarkMedian: number
  topQuartile: number
  bottomQuartile: number
  sampleSize: number
  clientValue: number | null
  insight: string
}

// ─── Constants ──────────────────────────────────────────────────────

type Section = 'brief' | 'benchmarks' | 'intelligence' | 'upload'

const SECTIONS: { key: Section; label: string; emoji: string }[] = [
  { key: 'brief', label: 'Your Brief', emoji: '📋' },
  { key: 'benchmarks', label: 'Benchmarks', emoji: '📊' },
  { key: 'intelligence', label: 'Intelligence', emoji: '🧠' },
  { key: 'upload', label: 'Upload Data', emoji: '📥' },
]

const CATEGORY_META: Record<string, { emoji: string; label: string }> = {
  revenue: { emoji: '💰', label: 'Revenue' },
  customer: { emoji: '👥', label: 'Customer' },
  reputation: { emoji: '⭐', label: 'Reputation' },
  marketing: { emoji: '📣', label: 'Marketing' },
  operations: { emoji: '⚙️', label: 'Operations' },
  seasonal: { emoji: '🌦️', label: 'Seasonal' },
  behavioral: { emoji: '🧭', label: 'Behavioral' },
  benchmark: { emoji: '📊', label: 'Benchmark' },
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

const METRIC_LABELS: Record<string, string> = {
  monthly_call_volume: 'Monthly Call Volume',
  cost_per_call: 'Cost per Call',
  review_rating_average: 'Review Rating',
  review_response_rate: 'Review Response Rate',
  monthly_revenue_estimate: 'Monthly Revenue',
  cogs_percentage: 'COGS %',
  lead_conversion_rate: 'Lead Conversion Rate',
  average_job_value: 'Average Job Value',
}

// ─── Styles (purple accent) ─────────────────────────────────────────

const card = 'bg-[#1E1B16] rounded-xl border border-[rgba(124,58,237,0.15)]'
const inputClass = 'bg-[#1E1B16] border border-[rgba(124,58,237,0.3)] text-[#F2EDE4] px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#7C3AED] w-full'
const btnPrimary = 'bg-[#7C3AED] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#8B5CF6] transition-colors disabled:opacity-50'
const btnSecondary = 'border border-[rgba(124,58,237,0.3)] text-[#7C3AED] px-4 py-2 rounded-lg text-sm hover:bg-[rgba(124,58,237,0.1)] transition-colors disabled:opacity-50'

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Main Portal Component ──────────────────────────────────────────

export default function MemoriaPortal() {
  const params = useParams()
  const slug = params.clientSlug as string

  const [client, setClient] = useState<PortalClient | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<Section>('brief')

  useEffect(() => {
    fetch(`/api/memoria/portal?slug=${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setNotFound(true)
        else setClient(data.client)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center">
        <div className="text-[#8A8070]">Loading your Memoria portal...</div>
      </div>
    )
  }

  if (notFound || !client) {
    return (
      <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🧠</div>
          <h1 className="text-xl font-semibold text-[#F2EDE4] mb-2">Portal Not Found</h1>
          <p className="text-sm text-[#8A8070]">This Memoria portal link is not valid.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-[#7C3AED] text-xs font-medium mb-2">
            <span>🧠</span> MEMORIA INTELLIGENCE
          </div>
          <h1 className="text-2xl font-semibold text-[#F2EDE4]">{client.businessName}</h1>
          <p className="text-sm text-[#8A8070]">
            Welcome, {client.ownerFirstName}. Your business intelligence is always learning.
          </p>
        </div>

        {/* Section Nav */}
        <div className="flex gap-1 mb-8 border-b border-[rgba(124,58,237,0.15)] pb-px">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                activeSection === s.key
                  ? 'bg-[#1E1B16] text-[#7C3AED] border border-[rgba(124,58,237,0.3)] border-b-[#1E1B16] -mb-px'
                  : 'text-[#8A8070] hover:text-[#F2EDE4]'
              }`}
            >
              {s.emoji} {s.label}
            </button>
          ))}
        </div>

        {activeSection === 'brief' && <BriefSection clientId={client.id} businessName={client.businessName} />}
        {activeSection === 'benchmarks' && <BenchmarkSection clientId={client.id} />}
        {activeSection === 'intelligence' && <IntelligenceSection clientId={client.id} />}
        {activeSection === 'upload' && <UploadSection clientId={client.id} industry={client.industry} />}
      </div>

      {/* Footer */}
      <div className="text-center mt-16 text-[10px] text-[#8A8070]">
        Powered by BaraTrust Memoria · Your business intelligence is confidential and never shared.
      </div>
    </div>
  )
}

// ─── Brief Section ──────────────────────────────────────────────────

function BriefSection({ clientId, businessName }: { clientId: string; businessName: string }) {
  const [brief, setBrief] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    // Try to generate the brief on load
    setLoading(true)
    fetch('/api/memoria/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    })
      .then((r) => r.json())
      .then((data) => setBrief(data.brief || ''))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  const regenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/memoria/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      const data = await res.json()
      setBrief(data.brief || '')
    } catch { /* ignore */ }
    setGenerating(false)
  }

  if (loading) {
    return <div className="text-center text-[#8A8070] py-20">Loading your Intelligence Brief...</div>
  }

  if (!brief) {
    return (
      <div className={card + ' p-8 text-center'}>
        <div className="text-4xl mb-4">📋</div>
        <h2 className="text-lg font-medium text-[#F2EDE4] mb-2">Your First Brief Is Coming</h2>
        <p className="text-sm text-[#8A8070] max-w-md mx-auto">
          Your first Memoria Intelligence Brief will be generated after your data intake is complete.
          Upload historical business data in the Upload Data tab to get started.
        </p>
      </div>
    )
  }

  return (
    <div className={card + ' border-[rgba(124,58,237,0.3)] p-6'}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-[#7C3AED]">🧠 Memoria Intelligence Brief — {businessName}</h2>
        <button onClick={regenerate} disabled={generating} className={btnSecondary + ' !text-xs !px-3 !py-1.5'}>
          {generating ? 'Generating...' : '🔄 Refresh Brief'}
        </button>
      </div>
      <div className="text-sm text-[#F2EDE4] whitespace-pre-wrap leading-relaxed">{brief}</div>
    </div>
  )
}

// ─── Benchmark Section ──────────────────────────────────────────────

function BenchmarkSection({ clientId }: { clientId: string }) {
  const [comparisons, setComparisons] = useState<Record<string, BenchmarkComparison> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/memoria/benchmarks?clientId=${clientId}`)
      .then((r) => r.json())
      .then((data) => setComparisons(data.comparisons || null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  if (loading) return <div className="text-center text-[#8A8070] py-20">Loading benchmarks...</div>

  if (!comparisons || Object.keys(comparisons).length === 0) {
    return (
      <div className={card + ' p-8 text-center'}>
        <div className="text-4xl mb-4">📊</div>
        <h2 className="text-lg font-medium text-[#F2EDE4] mb-2">Benchmarks Not Available Yet</h2>
        <p className="text-sm text-[#8A8070] max-w-md mx-auto">
          Benchmarks compare your business against others in your trade. More data is needed to generate comparisons.
        </p>
      </div>
    )
  }

  const PERCENTILE_COLORS: Record<string, string> = {
    'Top 25%': 'text-green-400 bg-green-500/20 border-green-500/30',
    'Above Median': 'text-blue-400 bg-blue-500/20 border-blue-500/30',
    'Below Median': 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
    'Bottom 25%': 'text-red-400 bg-red-500/20 border-red-500/30',
    'N/A': 'text-gray-400 bg-gray-500/20 border-gray-500/30',
  }

  function fmtVal(metric: string, value: number): string {
    if (['review_rating_average'].includes(metric)) return `${value.toFixed(1)}★`
    if (['review_response_rate', 'cogs_percentage', 'lead_conversion_rate'].includes(metric)) return `${value.toFixed(1)}%`
    if (['cost_per_call', 'monthly_revenue_estimate', 'average_job_value'].includes(metric)) return `$${Math.round(value).toLocaleString()}`
    if (['monthly_call_volume'].includes(metric)) return `${Math.round(value)}`
    return value.toLocaleString()
  }

  return (
    <div>
      <p className="text-xs text-[#8A8070] mb-4">
        How your business compares against others in your trade in the Louisville-Southern Indiana market.
        <span className="inline-block w-3 h-3 bg-[#7C3AED] rounded-full ml-2 align-middle border-2 border-[#F2EDE4]" /> = your business
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(comparisons).map(([metric, comp]) => {
          const { bottomQuartile: q1, benchmarkMedian: med, topQuartile: q3, clientValue } = comp
          const min = Math.min(q1, clientValue ?? q1) * 0.8
          const max = Math.max(q3, clientValue ?? q3) * 1.2
          const range = max - min || 1
          const toP = (v: number) => Math.max(0, Math.min(100, ((v - min) / range) * 100))
          const clientPos = clientValue !== null ? toP(clientValue) : null

          return (
            <div key={metric} className={card + ' p-4'}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-[#8A8070] uppercase tracking-wide">{METRIC_LABELS[metric] || metric}</div>
                {comp.percentile !== 'N/A' && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${PERCENTILE_COLORS[comp.percentile] || PERCENTILE_COLORS['N/A']}`}>
                    {comp.percentile}
                  </span>
                )}
              </div>
              <div className="relative h-8 bg-[#0E0C0A] rounded-lg overflow-hidden mb-2">
                <div className="absolute top-0 bottom-0 bg-red-500/10 rounded-l-lg" style={{ left: 0, width: `${toP(q1)}%` }} />
                <div className="absolute top-0 bottom-0 bg-yellow-500/10" style={{ left: `${toP(q1)}%`, width: `${toP(med) - toP(q1)}%` }} />
                <div className="absolute top-0 bottom-0 bg-blue-500/10" style={{ left: `${toP(med)}%`, width: `${toP(q3) - toP(med)}%` }} />
                <div className="absolute top-0 bottom-0 bg-green-500/10 rounded-r-lg" style={{ left: `${toP(q3)}%`, right: 0 }} />
                <div className="absolute top-0 bottom-0 w-px bg-red-400/50" style={{ left: `${toP(q1)}%` }} />
                <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-400/70" style={{ left: `${toP(med)}%` }} />
                <div className="absolute top-0 bottom-0 w-px bg-green-400/50" style={{ left: `${toP(q3)}%` }} />
                {clientPos !== null && (
                  <div className="absolute top-0 bottom-0 flex items-center" style={{ left: `${clientPos}%`, transform: 'translateX(-50%)' }}>
                    <div className="w-3 h-3 bg-[#7C3AED] rounded-full border-2 border-[#F2EDE4] shadow-lg shadow-[#7C3AED]/30 z-10" />
                  </div>
                )}
              </div>
              <div className="flex justify-between text-[10px] text-[#8A8070]">
                <span>Bottom 25%</span>
                <span>Median</span>
                <span>Top 25%</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-4 text-[10px] text-[#8A8070]">
                  <span>Q1: {fmtVal(metric, q1)}</span>
                  <span>Med: {fmtVal(metric, med)}</span>
                  <span>Q3: {fmtVal(metric, q3)}</span>
                </div>
                {clientValue !== null && (
                  <div className="text-xs font-medium text-[#7C3AED]">You: {fmtVal(metric, clientValue)}</div>
                )}
              </div>
              {comp.insight && comp.percentile !== 'N/A' && (
                <p className="text-xs text-[#8A8070] mt-2 leading-relaxed">{comp.insight}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Intelligence Section ───────────────────────────────────────────

function IntelligenceSection({ clientId }: { clientId: string }) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/memoria/insights?clientId=${clientId}`)
      .then((r) => r.json())
      .then((data) => setInsights(data.insights || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  if (loading) return <div className="text-center text-[#8A8070] py-20">Loading intelligence...</div>

  if (insights.length === 0) {
    return (
      <div className={card + ' p-8 text-center'}>
        <div className="text-4xl mb-4">🧠</div>
        <h2 className="text-lg font-medium text-[#F2EDE4] mb-2">No Intelligence Yet</h2>
        <p className="text-sm text-[#8A8070]">Upload business data to start building your intelligence profile.</p>
      </div>
    )
  }

  const grouped: Record<string, Insight[]> = {}
  for (const ins of insights) {
    if (!grouped[ins.category]) grouped[ins.category] = []
    grouped[ins.category].push(ins)
  }

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([cat, items]) => {
        const meta = CATEGORY_META[cat] || { emoji: '📌', label: cat }
        return (
          <div key={cat}>
            <h3 className="text-sm font-medium text-[#F2EDE4] mb-3 flex items-center gap-2">
              <span>{meta.emoji}</span> {meta.label}
              <span className="text-[10px] text-[#8A8070] bg-[#0E0C0A] px-2 py-0.5 rounded-full">{items.length}</span>
            </h3>
            <div className="space-y-2">
              {items.map((ins) => (
                <div key={ins.id} className={card + ' p-4'}>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${CONFIDENCE_COLORS[ins.confidence]}`}>
                      {ins.confidence}
                    </span>
                    <span className="text-[10px] text-[#8A8070]">{ins.dataPoints} data point{ins.dataPoints !== 1 ? 's' : ''}</span>
                    {ins.isBenchmark && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium">benchmark</span>
                    )}
                  </div>
                  <p className="text-sm text-[#F2EDE4] leading-relaxed">{ins.insight}</p>
                  <div className="text-[10px] text-[#8A8070] mt-2">Last confirmed: {fmtDate(ins.lastConfirmed)}</div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Upload Section ─────────────────────────────────────────────────

function UploadSection({ clientId, industry }: { clientId: string; industry: string }) {
  const [data, setData] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ insights: number } | null>(null)

  const submit = async () => {
    if (!data.trim()) return
    setSubmitting(true)
    setResult(null)
    try {
      const now = new Date()
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)
      const res = await fetch('/api/memoria/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          dataType: 'general',
          periodStart: sixMonthsAgo.toISOString().split('T')[0],
          periodEnd: now.toISOString().split('T')[0],
          rawData: data,
          clientTrade: industry,
        }),
      })
      const json = await res.json()
      setResult({ insights: json.insightsCreated || 0 })
      setData('')
    } catch { /* ignore */ }
    setSubmitting(false)
  }

  return (
    <div className={card + ' p-6'}>
      <h3 className="text-sm font-medium text-[#F2EDE4] mb-2">Upload New Business Data</h3>
      <p className="text-xs text-[#8A8070] mb-4">
        Paste any business data — invoices, expenses, lead records, job records, ad spend, anything.
        Any format is fine: CSV rows, JSON, plain text descriptions. Include dates, amounts, and descriptions where possible.
      </p>

      <textarea
        value={data}
        onChange={(e) => setData(e.target.value)}
        className={inputClass + ' min-h-[200px] font-mono text-xs'}
        placeholder="Paste your business data here in any format..."
      />

      <div className="flex items-center justify-between mt-4">
        <p className="text-[10px] text-[#8A8070]">
          New data is processed within 24 hours and your next brief will reflect these additions.
        </p>
        <button onClick={submit} disabled={submitting || !data.trim()} className={btnPrimary}>
          {submitting ? 'Processing...' : '📥 Submit Data'}
        </button>
      </div>

      {result && (
        <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
          <div className="text-green-400 text-sm font-medium">
            ✅ Data processed — {result.insights} insight{result.insights !== 1 ? 's' : ''} generated
          </div>
        </div>
      )}
    </div>
  )
}
