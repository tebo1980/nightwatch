'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

// ─── Types ──────────────────────────────────────────────────────────

interface Insight {
  id: string
  clientId: string
  category: string
  insight: string
  confidence: string
  dataPoints: number
  firstObserved: string
  lastConfirmed: string
  source: string
  actionTaken: string | null
  isActive: boolean
  isBenchmark: boolean
  tradeVertical: string | null
}

interface AgentClientOption {
  id: string
  businessName: string
  industry: string
  ownerName: string
}

interface Benchmark {
  id: string
  tradeVertical: string
  metric: string
  metricValue: number
  percentile: string
  sampleSize: number
  region: string
  calculatedAt: string
}

// ─── Constants ──────────────────────────────────────────────────────

type Tab = 'intelligence' | 'intake' | 'benchmarks' | 'settings'

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'intelligence', label: 'Intelligence', emoji: '🧠' },
  { key: 'intake', label: 'Data Intake', emoji: '📥' },
  { key: 'benchmarks', label: 'Benchmarks', emoji: '📊' },
  { key: 'settings', label: 'Settings', emoji: '⚙️' },
]

const CATEGORIES = ['revenue', 'customer', 'reputation', 'marketing', 'operations', 'seasonal', 'behavioral'] as const

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

const DATA_TYPE_OPTIONS = [
  { key: 'invoices', label: 'Invoices / Revenue' },
  { key: 'ad_spend', label: 'Ad Spend' },
  { key: 'leads', label: 'Lead Records' },
  { key: 'expenses', label: 'Expense Records' },
  { key: 'customers', label: 'Customer Records' },
  { key: 'jobs', label: 'Job Records' },
]

const AGENTS = [
  { key: 'rex', name: 'Rex', emoji: '🦖', role: 'Reputation' },
  { key: 'iris', name: 'Iris', emoji: '🌺', role: 'Lead Follow-up' },
  { key: 'max', name: 'Max', emoji: '💪', role: 'Revenue & Collections' },
  { key: 'della', name: 'Della', emoji: '✉️', role: 'Email Drafting' },
  { key: 'sage', name: 'Sage', emoji: '🌿', role: 'Social Media' },
  { key: 'flynn', name: 'Flynn', emoji: '🚗', role: 'Fleet Management' },
  { key: 'cole', name: 'Cole', emoji: '📊', role: 'Cost & Inventory' },
  { key: 'river', name: 'River', emoji: '🌊', role: 'Appointments' },
  { key: 'atlas', name: 'Atlas', emoji: '🗺️', role: 'Material Pricing' },
  { key: 'bolt', name: 'Bolt', emoji: '⚡', role: 'On-Site Estimates' },
]

// ─── Helpers ────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Shared UI pieces ───────────────────────────────────────────────

const cardClass = 'bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)]'
const inputClass = 'bg-[#1E1B16] border border-[rgba(193,123,42,0.3)] text-[#F2EDE4] px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#C17B2A] w-full'
const btnPrimary = 'bg-[#C17B2A] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-50'
const btnSecondary = 'border border-[rgba(193,123,42,0.3)] text-[#C17B2A] px-4 py-2 rounded-lg text-sm hover:bg-[rgba(193,123,42,0.1)] transition-colors disabled:opacity-50'

// ─── Main Component ─────────────────────────────────────────────────

export default function MemoriaPage() {
  const [activeTab, setActiveTab] = useState<Tab>('intelligence')
  const [clients, setClients] = useState<AgentClientOption[]>([])

  useEffect(() => {
    fetch('/api/agent-clients')
      .then((r) => r.json())
      .then((data) => setClients(data.clients || []))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/" className="text-[#8A8070] text-sm hover:text-[#C17B2A] transition-colors mb-2 inline-block">&larr; Dashboard</Link>
          <h1 className="text-2xl font-semibold text-[#F2EDE4] flex items-center gap-2">
            <span>🧠</span> Memoria Intelligence
          </h1>
          <p className="text-sm text-[#8A8070]">Shared client intelligence across all agents</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-[rgba(193,123,42,0.15)] pb-px">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === t.key
                  ? 'bg-[#1E1B16] text-[#C17B2A] border border-[rgba(193,123,42,0.3)] border-b-[#1E1B16] -mb-px'
                  : 'text-[#8A8070] hover:text-[#F2EDE4]'
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'intelligence' && <IntelligenceTab clients={clients} />}
        {activeTab === 'intake' && <IntakeTab clients={clients} />}
        {activeTab === 'benchmarks' && <BenchmarksTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 1: Intelligence
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function IntelligenceTab({ clients }: { clients: AgentClientOption[] }) {
  const [selectedClient, setSelectedClient] = useState('')
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(false)
  const [brief, setBrief] = useState('')
  const [reportLoading, setReportLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sendingToDella, setSendingToDella] = useState(false)
  const [dellaSent, setDellaSent] = useState(false)

  const loadInsights = useCallback(() => {
    if (!selectedClient) { setInsights([]); return }
    setLoading(true)
    fetch(`/api/memoria/insights?clientId=${selectedClient}`)
      .then((r) => r.json())
      .then((data) => setInsights(data.insights || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedClient])

  useEffect(() => {
    setBrief('')
    setDellaSent(false)
    loadInsights()
  }, [loadInsights])

  const generateReport = async () => {
    if (!selectedClient) return
    setReportLoading(true)
    setBrief('')
    setDellaSent(false)
    try {
      const res = await fetch('/api/memoria/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClient }),
      })
      const data = await res.json()
      setBrief(data.brief || data.summary || 'No data available.')
    } catch {
      setBrief('Failed to generate report.')
    } finally {
      setReportLoading(false)
    }
  }

  const copyBrief = () => {
    navigator.clipboard.writeText(brief).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const sendToClient = async () => {
    const client = clients.find((c) => c.id === selectedClient)
    if (!client || !brief) return
    setSendingToDella(true)
    try {
      await fetch('/api/della/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient,
          emailType: 'intelligence-brief',
          recipientName: client.ownerName,
          requestNotes: `Send the following Memoria Intelligence Brief to the client:\n\n${brief}`,
        }),
      })
      setDellaSent(true)
    } catch { /* ignore */ }
    setSendingToDella(false)
  }

  const markInactive = async (insightId: string) => {
    await fetch('/api/memoria/insights', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insightId, isActive: false }),
    })
    setInsights((prev) => prev.filter((i) => i.id !== insightId))
  }

  // Group insights by category in display order
  const grouped: Record<string, Insight[]> = {}
  for (const ins of insights) {
    const cat = ins.category
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(ins)
  }
  // Order: CATEGORIES first, then any extras
  const orderedCategories = [
    ...CATEGORIES.filter((c) => grouped[c]),
    ...Object.keys(grouped).filter((c) => !CATEGORIES.includes(c as typeof CATEGORIES[number])),
  ]

  return (
    <>
      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className={inputClass + ' !w-auto min-w-[260px]'}>
          <option value="">Select a client...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.businessName} — {c.industry}</option>
          ))}
        </select>
        {selectedClient && (
          <button onClick={generateReport} disabled={reportLoading} className={btnPrimary}>
            {reportLoading ? 'Generating...' : '📋 Generate Memoria Report'}
          </button>
        )}
      </div>

      {/* Stats */}
      {selectedClient && insights.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className={cardClass + ' p-4'}>
            <div className="text-2xl font-semibold text-[#C17B2A]">{insights.length}</div>
            <div className="text-xs text-[#8A8070] mt-1">Total Insights</div>
          </div>
          <div className={cardClass + ' p-4'}>
            <div className="text-2xl font-semibold text-green-400">{insights.filter((i) => i.confidence === 'high').length}</div>
            <div className="text-xs text-[#8A8070] mt-1">High Confidence</div>
          </div>
          <div className={cardClass + ' p-4'}>
            <div className="text-2xl font-semibold text-[#C17B2A]">{orderedCategories.length}</div>
            <div className="text-xs text-[#8A8070] mt-1">Categories</div>
          </div>
          <div className={cardClass + ' p-4'}>
            <div className="text-2xl font-semibold text-blue-400">{insights.filter((i) => i.isBenchmark).length}</div>
            <div className="text-xs text-[#8A8070] mt-1">Benchmarks</div>
          </div>
        </div>
      )}

      {/* Intelligence Brief */}
      {brief && (
        <div className={cardClass + ' border-[rgba(193,123,42,0.3)] p-6 mb-6'}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-[#C17B2A]">🧠 Memoria Intelligence Brief</h2>
            <div className="flex gap-2">
              <button onClick={copyBrief} className={btnSecondary + ' !text-xs !px-3 !py-1.5'}>
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>
              <button
                onClick={sendToClient}
                disabled={sendingToDella || dellaSent}
                className={btnPrimary + ' !text-xs !px-3 !py-1.5'}
              >
                {dellaSent ? '✓ Sent to Della' : sendingToDella ? 'Sending...' : '✉️ Send to Client'}
              </button>
            </div>
          </div>
          <div className="text-sm text-[#F2EDE4] whitespace-pre-wrap leading-relaxed">{brief}</div>
        </div>
      )}

      {/* Insights by category */}
      {loading ? (
        <div className="text-center text-[#8A8070] py-20">Loading insights...</div>
      ) : !selectedClient ? (
        <div className="text-center py-20">
          <p className="text-[#8A8070] text-lg mb-2">🧠</p>
          <p className="text-[#8A8070]">Select a client to view their intelligence profile</p>
        </div>
      ) : insights.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[#8A8070]">No insights recorded yet for this client.</p>
          <p className="text-xs text-[#8A8070] mt-2">Insights are gathered automatically as agents interact with this client, or load historical data in the Data Intake tab.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {orderedCategories.map((cat) => {
            const meta = CATEGORY_META[cat] || { emoji: '📌', label: cat }
            const items = grouped[cat]
            return (
              <div key={cat}>
                <h3 className="text-sm font-medium text-[#F2EDE4] mb-3 flex items-center gap-2">
                  <span>{meta.emoji}</span> {meta.label}
                  <span className="text-[10px] text-[#8A8070] bg-[#0E0C0A] px-2 py-0.5 rounded-full">{items.length}</span>
                </h3>
                <div className="space-y-2">
                  {items.map((ins) => (
                    <div key={ins.id} className={cardClass + ' p-4 hover:border-[rgba(193,123,42,0.3)] transition-colors'}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${CONFIDENCE_COLORS[ins.confidence]}`}>
                              {ins.confidence}
                            </span>
                            <span className="text-[10px] text-[#8A8070]">{ins.dataPoints} data point{ins.dataPoints !== 1 ? 's' : ''}</span>
                            <span className="text-[10px] text-[#8A8070]">via {ins.source}</span>
                            {ins.isBenchmark && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium">benchmark</span>
                            )}
                          </div>
                          <p className="text-sm text-[#F2EDE4] leading-relaxed">{ins.insight}</p>
                          {ins.actionTaken && <p className="text-xs text-[#C17B2A] mt-1">Action: {ins.actionTaken}</p>}
                          <div className="flex gap-4 mt-2 text-[10px] text-[#8A8070]">
                            <span>First: {fmtDate(ins.firstObserved)}</span>
                            <span>Last confirmed: {fmtDate(ins.lastConfirmed)}</span>
                            {ins.tradeVertical && <span className="text-[#C17B2A]">{ins.tradeVertical}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => markInactive(ins.id)}
                          className="text-[10px] text-[#8A8070] hover:text-red-400 transition-colors shrink-0 border border-transparent hover:border-red-400/30 px-2 py-1 rounded"
                          title="Mark as inactive"
                        >
                          Mark Inactive
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 2: Data Intake
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function IntakeTab({ clients }: { clients: AgentClientOption[] }) {
  const [step, setStep] = useState(1)

  // Step 1
  const [intakeClient, setIntakeClient] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])

  // Step 2
  const [dataEntries, setDataEntries] = useState<Record<string, string>>({})

  // Step 3
  const [processing, setProcessing] = useState(false)
  const [processProgress, setProcessProgress] = useState({ current: 0, total: 0 })
  const [processResult, setProcessResult] = useState<{ totalInsights: number; totalDataPoints: number; categories: string[] } | null>(null)
  const [processError, setProcessError] = useState('')

  const toggleType = (key: string) => {
    setSelectedTypes((prev) => prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key])
  }

  const canProceedStep1 = intakeClient && periodStart && periodEnd && selectedTypes.length > 0
  const canProceedStep2 = selectedTypes.every((t) => dataEntries[t]?.trim())

  const processData = async () => {
    setProcessing(true)
    setProcessError('')
    setProcessResult(null)
    setProcessProgress({ current: 0, total: selectedTypes.length })

    let totalInsights = 0
    let totalDataPoints = 0
    const allCategories = new Set<string>()

    for (let i = 0; i < selectedTypes.length; i++) {
      const dataType = selectedTypes[i]
      const rawData = dataEntries[dataType]
      setProcessProgress({ current: i + 1, total: selectedTypes.length })

      try {
        const res = await fetch('/api/memoria/intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: intakeClient,
            dataType,
            periodStart,
            periodEnd,
            rawData,
          }),
        })
        const data = await res.json()
        if (data.error) {
          setProcessError((prev) => prev + `\n${dataType}: ${data.error}`)
          continue
        }
        totalInsights += data.insightsCreated || 0
        totalDataPoints += data.dataPoints || 0
        if (data.categories) data.categories.forEach((c: string) => allCategories.add(c))
      } catch {
        setProcessError((prev) => prev + `\n${dataType}: Network error`)
      }
    }

    setProcessResult({
      totalInsights,
      totalDataPoints,
      categories: [...allCategories],
    })
    setProcessing(false)
  }

  return (
    <>
      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === s ? 'bg-[#C17B2A] text-white' : step > s ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-[#1E1B16] text-[#8A8070] border border-[rgba(193,123,42,0.15)]'
            }`}>{step > s ? '✓' : s}</div>
            {s < 3 && <div className={`w-12 h-px ${step > s ? 'bg-green-500/30' : 'bg-[rgba(193,123,42,0.15)]'}`} />}
          </div>
        ))}
        <span className="text-xs text-[#8A8070] ml-2">
          {step === 1 && 'Select client & data types'}
          {step === 2 && 'Paste your data'}
          {step === 3 && 'Process & generate insights'}
        </span>
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className={cardClass + ' p-6 space-y-6'}>
          <div>
            <label className="text-xs text-[#8A8070] mb-2 block">Client</label>
            <select value={intakeClient} onChange={(e) => setIntakeClient(e.target.value)} className={inputClass}>
              <option value="">Select a client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.businessName} — {c.industry}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#8A8070] mb-2 block">Period Start</label>
              <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-[#8A8070] mb-2 block">Period End</label>
              <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="text-xs text-[#8A8070] mb-3 block">Data Types (select all that apply)</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {DATA_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => toggleType(opt.key)}
                  className={`p-3 rounded-lg text-sm text-left transition-colors border ${
                    selectedTypes.includes(opt.key)
                      ? 'bg-[#C17B2A]/10 border-[#C17B2A] text-[#C17B2A]'
                      : 'bg-[#0E0C0A] border-[rgba(193,123,42,0.15)] text-[#8A8070] hover:border-[rgba(193,123,42,0.3)]'
                  }`}
                >
                  <span className="mr-2">{selectedTypes.includes(opt.key) ? '☑' : '☐'}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => setStep(2)} disabled={!canProceedStep1} className={btnPrimary}>
              Next: Paste Data →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-6">
          {selectedTypes.map((typeKey) => {
            const label = DATA_TYPE_OPTIONS.find((o) => o.key === typeKey)?.label || typeKey
            return (
              <div key={typeKey} className={cardClass + ' p-6'}>
                <label className="text-sm font-medium text-[#F2EDE4] mb-2 block">
                  Paste your {label} data here
                </label>
                <p className="text-xs text-[#8A8070] mb-3">Any format is fine. Include dates, amounts, and descriptions where possible.</p>
                <textarea
                  value={dataEntries[typeKey] || ''}
                  onChange={(e) => setDataEntries((prev) => ({ ...prev, [typeKey]: e.target.value }))}
                  className={inputClass + ' min-h-[180px] font-mono text-xs'}
                  placeholder={`Paste ${label.toLowerCase()} data — CSV rows, JSON, plain text, anything you have...`}
                />
              </div>
            )
          })}

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className={btnSecondary}>← Back</button>
            <button onClick={() => setStep(3)} disabled={!canProceedStep2} className={btnPrimary}>
              Next: Process →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className={cardClass + ' p-8 text-center'}>
          {!processResult && !processing && (
            <>
              <h3 className="text-lg font-medium text-[#F2EDE4] mb-2">Ready to Process</h3>
              <p className="text-sm text-[#8A8070] mb-1">
                Client: <span className="text-[#F2EDE4]">{clients.find((c) => c.id === intakeClient)?.businessName}</span>
              </p>
              <p className="text-sm text-[#8A8070] mb-1">
                Period: <span className="text-[#F2EDE4]">{periodStart} to {periodEnd}</span>
              </p>
              <p className="text-sm text-[#8A8070] mb-6">
                Data types: <span className="text-[#F2EDE4]">{selectedTypes.map((t) => DATA_TYPE_OPTIONS.find((o) => o.key === t)?.label).join(', ')}</span>
              </p>
              <button onClick={processData} className={btnPrimary + ' text-base px-8 py-3'}>
                🧠 Process Historical Data
              </button>
              <div className="mt-4">
                <button onClick={() => setStep(2)} className={btnSecondary}>← Back to Edit</button>
              </div>
            </>
          )}

          {processing && (
            <>
              <div className="w-16 h-16 border-4 border-[rgba(193,123,42,0.3)] border-t-[#C17B2A] rounded-full animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#F2EDE4] mb-2">Processing with Claude AI...</h3>
              <p className="text-sm text-[#8A8070]">
                Analyzing data type {processProgress.current} of {processProgress.total}
              </p>
              <div className="w-64 mx-auto mt-4 bg-[#0E0C0A] rounded-full h-2">
                <div
                  className="bg-[#C17B2A] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(processProgress.current / processProgress.total) * 100}%` }}
                />
              </div>
            </>
          )}

          {processResult && (
            <>
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-lg font-medium text-[#F2EDE4] mb-4">Processing Complete</h3>
              <div className="grid grid-cols-3 gap-6 max-w-md mx-auto mb-6">
                <div>
                  <div className="text-2xl font-semibold text-[#C17B2A]">{processResult.totalInsights}</div>
                  <div className="text-xs text-[#8A8070]">Insights Generated</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-[#C17B2A]">{processResult.totalDataPoints}</div>
                  <div className="text-xs text-[#8A8070]">Data Points</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-[#C17B2A]">{processResult.categories.length}</div>
                  <div className="text-xs text-[#8A8070]">Categories</div>
                </div>
              </div>
              {processResult.categories.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center mb-6">
                  {processResult.categories.map((cat) => (
                    <span key={cat} className="text-xs px-3 py-1 rounded-full bg-[#C17B2A]/10 text-[#C17B2A] border border-[#C17B2A]/30">
                      {CATEGORY_META[cat]?.emoji || '📌'} {CATEGORY_META[cat]?.label || cat}
                    </span>
                  ))}
                </div>
              )}
              {processError && <p className="text-xs text-red-400 mb-4 whitespace-pre-line">{processError.trim()}</p>}
              <button
                onClick={() => { setStep(1); setProcessResult(null); setProcessError(''); setDataEntries({}); setSelectedTypes([]); }}
                className={btnSecondary}
              >
                Load More Data
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 3: Benchmarks
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function BenchmarksTab() {
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([])
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)

  const loadBenchmarks = useCallback(() => {
    setLoading(true)
    fetch('/api/memoria/benchmarks')
      .then((r) => r.json())
      .then((data) => setBenchmarks(data.benchmarks || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadBenchmarks() }, [loadBenchmarks])

  const recalculate = async () => {
    setRecalculating(true)
    try {
      await fetch('/api/memoria/benchmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recalculate: true }),
      })
      loadBenchmarks()
    } catch { /* ignore */ }
    setRecalculating(false)
  }

  // Group by trade vertical
  const grouped: Record<string, Benchmark[]> = {}
  for (const bm of benchmarks) {
    if (!grouped[bm.tradeVertical]) grouped[bm.tradeVertical] = []
    grouped[bm.tradeVertical].push(bm)
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-[#8A8070]">Benchmarks calculated from aggregated client data by trade vertical</p>
        <button onClick={recalculate} disabled={recalculating} className={btnSecondary}>
          {recalculating ? 'Recalculating...' : '🔄 Recalculate Benchmarks'}
        </button>
      </div>

      {loading ? (
        <div className="text-center text-[#8A8070] py-20">Loading benchmarks...</div>
      ) : benchmarks.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[#8A8070]">No benchmarks yet.</p>
          <p className="text-xs text-[#8A8070] mt-2">Benchmarks are generated as client data is processed through the Data Intake tab.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([vertical, bms]) => (
            <div key={vertical}>
              <h3 className="text-sm font-medium text-[#F2EDE4] mb-3 flex items-center gap-2">
                🏗️ {vertical}
                <span className="text-[10px] text-[#8A8070] bg-[#0E0C0A] px-2 py-0.5 rounded-full">{bms.length} metrics</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {bms.map((bm) => (
                  <div key={bm.id} className={cardClass + ' p-4'}>
                    <div className="text-xs text-[#8A8070] uppercase tracking-wide mb-1">{bm.metric}</div>
                    <div className="text-lg font-semibold text-[#F2EDE4]">{bm.metricValue.toLocaleString()}</div>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-[#8A8070]">
                      <span className="text-[#C17B2A]">{bm.percentile}</span>
                      <span>{bm.sampleSize} client{bm.sampleSize !== 1 ? 's' : ''} contributing</span>
                    </div>
                    <div className="text-[10px] text-[#8A8070] mt-1">{bm.region} &middot; {fmtDate(bm.calculatedAt)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 4: Settings
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SettingsTab() {
  const [agentToggles, setAgentToggles] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {}
    AGENTS.forEach((a) => { defaults[a.key] = true })
    return defaults
  })
  const [agentStats, setAgentStats] = useState<Record<string, { lastInsight: string | null; totalInsights: number }>>({})
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    // Load stored toggles from localStorage
    try {
      const stored = localStorage.getItem('memoria-agent-toggles')
      if (stored) setAgentToggles(JSON.parse(stored))
    } catch { /* ignore */ }

    // Load agent contribution stats
    fetch('/api/memoria/insights?allAgentStats=true')
      .then((r) => r.json())
      .then((data) => {
        if (data.agentStats) setAgentStats(data.agentStats)
      })
      .catch(() => {})
      .finally(() => setLoadingStats(false))
  }, [])

  const toggleAgent = (key: string) => {
    const updated = { ...agentToggles, [key]: !agentToggles[key] }
    setAgentToggles(updated)
    localStorage.setItem('memoria-agent-toggles', JSON.stringify(updated))
  }

  return (
    <>
      <div className="mb-6">
        <h3 className="text-sm font-medium text-[#F2EDE4] mb-1">Automatic Insight Generation</h3>
        <p className="text-xs text-[#8A8070]">Control which agents contribute insights to Memoria automatically.</p>
      </div>

      <div className="space-y-2">
        {AGENTS.map((agent) => {
          const stats = agentStats[agent.key]
          return (
            <div key={agent.key} className={cardClass + ' p-4 flex items-center justify-between'}>
              <div className="flex items-center gap-3">
                <span className="text-lg">{agent.emoji}</span>
                <div>
                  <div className="text-sm font-medium text-[#F2EDE4]">{agent.name}</div>
                  <div className="text-xs text-[#8A8070]">{agent.role}</div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                {!loadingStats && (
                  <div className="text-right">
                    <div className="text-xs text-[#8A8070]">
                      {stats?.totalInsights || 0} insight{(stats?.totalInsights || 0) !== 1 ? 's' : ''}
                    </div>
                    <div className="text-[10px] text-[#8A8070]">
                      {stats?.lastInsight ? `Last: ${fmtDate(stats.lastInsight)}` : 'No contributions yet'}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => toggleAgent(agent.key)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    agentToggles[agent.key] ? 'bg-[#C17B2A]' : 'bg-[#333]'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    agentToggles[agent.key] ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
