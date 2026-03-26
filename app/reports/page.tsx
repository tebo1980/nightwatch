'use client'

import { useEffect, useState, useCallback, Suspense, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface ReportClient {
  id: string; businessName: string; industry: string; ownerName: string; ownerFirstName: string
  tier: string; city: string; state: string
  novaEnabled: boolean; rexEnabled: boolean; irisEnabled: boolean; maxEnabled: boolean
  dellaEnabled: boolean; sageEnabled: boolean; flynnEnabled: boolean; coleEnabled: boolean
  riverEnabled: boolean; atlasEnabled: boolean; memoriaEnabled: boolean
}

interface SavedReport { id: string; reportMonth: number; reportYear: number; reportText: string; generatedAt: string }

const AGENTS = [
  { key: 'novaEnabled', name: 'Nova', hint: 'e.g. Nova handled 12 inquiries and captured 4 leads' },
  { key: 'rexEnabled', name: 'Rex', hint: 'e.g. Rex responded to 3 new reviews' },
  { key: 'irisEnabled', name: 'Iris', hint: 'e.g. Iris sent 2 follow-up sequences' },
  { key: 'maxEnabled', name: 'Max', hint: 'e.g. Max sent 5 review requests and 2 payment reminders' },
  { key: 'dellaEnabled', name: 'Della', hint: 'e.g. Della drafted 4 emails' },
  { key: 'sageEnabled', name: 'Sage', hint: 'e.g. Sage published 8 social posts' },
  { key: 'flynnEnabled', name: 'Flynn', hint: 'e.g. Flynn logged 1200 miles across 3 vehicles' },
  { key: 'coleEnabled', name: 'Cole', hint: 'e.g. Cole tracked $4200 in expenses' },
  { key: 'riverEnabled', name: 'River', hint: 'e.g. River managed 15 appointments' },
  { key: 'atlasEnabled', name: 'Atlas', hint: 'e.g. Atlas tracked 3 material price changes' },
  { key: 'memoriaEnabled', name: 'Memoria', hint: 'e.g. Memoria generated 12 insights and 1 intelligence brief' },
] as const

const CALL_SOURCES = ['Google Ads', 'Facebook Ads', 'Google Business Profile', 'Direct', 'Website Organic', 'Other']
const WEAK_CATS = ['Visibility', 'Lead Capture', 'Profitability', 'Customer Quality', 'Reputation']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const inputCls = 'w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] transition-colors placeholder:text-[#8A8070]/50'
const sectionCls = 'bg-[#0E0C0A] rounded-xl p-5 border border-[rgba(193,123,42,0.1)]'
const btnPrimary = 'bg-[#C17B2A] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-50'
const btnSecondary = 'border border-[rgba(193,123,42,0.3)] text-[#C17B2A] px-4 py-2 rounded-lg text-sm hover:bg-[rgba(193,123,42,0.1)] transition-colors'

function ReportsContent() {
  const searchParams = useSearchParams()
  const urlClientId = searchParams.get('clientId')

  const [allClients, setAllClients] = useState<{ id: string; businessName: string }[]>([])
  const [selectedClientId, setSelectedClientId] = useState(urlClientId || '')
  const [client, setClient] = useState<ReportClient | null>(null)
  const [reports, setReports] = useState<SavedReport[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const reportRef = useRef<HTMLTextAreaElement>(null)

  // Form state
  const [totalCalls, setTotalCalls] = useState('')
  const [lastMonthCalls, setLastMonthCalls] = useState('')
  const [guaranteeCalls, setGuaranteeCalls] = useState('')
  const [guaranteeDaysLeft, setGuaranteeDaysLeft] = useState('')
  const [topCallSource, setTopCallSource] = useState(CALL_SOURCES[0])
  const [fbSpend, setFbSpend] = useState('')
  const [googleSpend, setGoogleSpend] = useState('')
  const [costPerCall, setCostPerCall] = useState('')
  const [bestAd, setBestAd] = useState('')
  const [healthScore, setHealthScore] = useState('')
  const [lastHealthScore, setLastHealthScore] = useState('')
  const [weakestCategory, setWeakestCategory] = useState(WEAK_CATS[0])
  const [agentSummaries, setAgentSummaries] = useState<Record<string, string>>({})
  const [whatWorked, setWhatWorked] = useState('')
  const [challenges, setChallenges] = useState('')
  const [specific, setSpecific] = useState('')

  // Output
  const [reportText, setReportText] = useState('')
  const [generating, setGenerating] = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  // Load client list
  useEffect(() => {
    fetch('/api/agent-clients')
      .then((r) => r.json())
      .then((data) => setAllClients((data.clients || []).map((c: { id: string; businessName: string }) => ({ id: c.id, businessName: c.businessName }))))
      .catch(() => {})
      .finally(() => { if (!urlClientId) setLoading(false) })
  }, [urlClientId])

  // Load selected client data
  const loadClient = useCallback(() => {
    if (!selectedClientId) { setClient(null); setReports([]); setLoading(false); return }
    setLoading(true)
    fetch(`/api/reports?clientId=${selectedClientId}`)
      .then((r) => r.json())
      .then((data) => {
        setClient(data.client || null)
        setReports(data.reports || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedClientId])

  useEffect(() => { loadClient() }, [loadClient])

  const activeAgents = client ? AGENTS.filter((a) => client[a.key as keyof ReportClient]) : []

  const generate = async () => {
    if (!client) return
    setGenerating(true)
    setReportText('')
    try {
      const summaries = activeAgents
        .filter((a) => agentSummaries[a.name]?.trim())
        .map((a) => ({ name: a.name, summary: agentSummaries[a.name] }))

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          clientName: client.businessName, ownerFirstName: client.ownerFirstName,
          trade: client.industry, tier: client.tier, city: client.city,
          totalCalls, lastMonthCalls, guaranteeCalls, guaranteeDaysLeft, topCallSource,
          fbSpend, googleSpend, costPerCall, bestAd,
          healthScore, lastHealthScore, weakestCategory,
          agentSummaries: summaries, whatWorked, challenges, specific,
        }),
      })
      const data = await res.json()
      setReportText(data.reportText || '')
      if (data.reportText) showToast('Report generated!')
    } catch { showToast('Generation failed.') }
    setGenerating(false)
  }

  const saveReport = async () => {
    if (!client || !reportText) return
    const now = new Date()
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save', clientId: client.id,
        reportMonth: now.getMonth() + 1, reportYear: now.getFullYear(), reportText,
      }),
    })
    showToast('Report saved!')
    loadClient()
  }

  const printReport = () => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<html><head><title>${client?.businessName} Report</title><style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;line-height:1.6;color:#222;white-space:pre-wrap;}</style></head><body>${reportText}</body></html>`)
    w.document.close()
    w.print()
  }

  const resetForm = () => {
    if (!confirm('Reset all form fields? This cannot be undone.')) return
    setTotalCalls(''); setLastMonthCalls(''); setGuaranteeCalls(''); setGuaranteeDaysLeft('')
    setTopCallSource(CALL_SOURCES[0]); setFbSpend(''); setGoogleSpend(''); setCostPerCall('')
    setBestAd(''); setHealthScore(''); setLastHealthScore(''); setWeakestCategory(WEAK_CATS[0])
    setAgentSummaries({}); setWhatWorked(''); setChallenges(''); setSpecific(''); setReportText('')
  }

  const loadSavedReport = (r: SavedReport) => {
    setReportText(r.reportText)
    showToast(`Loaded ${MONTHS[r.reportMonth - 1]} ${r.reportYear} report`)
  }

  if (loading) return <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center text-[#8A8070]">Loading...</div>

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        {toast && <div className="fixed top-6 right-6 bg-[#1E1B16] border border-[#C17B2A]/30 text-[#F2EDE4] text-sm px-5 py-3 rounded-lg shadow-lg z-50">{toast}</div>}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/" className="text-xs text-[#8A8070] hover:text-[#C17B2A] transition-colors">&larr; Dashboard</Link>
            <h1 className="text-2xl font-semibold text-[#F2EDE4] mt-1 flex items-center gap-2">
              <span>📊</span> Monthly Report Generator
            </h1>
            <p className="text-sm text-[#8A8070]">Generate client performance reports in Todd&apos;s voice</p>
          </div>
          {reportText && <button onClick={resetForm} className={btnSecondary + ' !text-xs'}>Reset Form</button>}
        </div>

        {/* Client Selector */}
        <div className="mb-6">
          <select className="bg-[#1E1B16] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] w-full md:w-80"
            value={selectedClientId} onChange={(e) => { setSelectedClientId(e.target.value); setReportText('') }}>
            <option value="">Select a client...</option>
            {allClients.map((c) => <option key={c.id} value={c.id}>{c.businessName}</option>)}
          </select>
        </div>

        {!client ? (
          <div className="text-center py-20 text-[#8A8070]">Select a client to generate a report.</div>
        ) : (
          <div className="space-y-6">
            {/* SECTION 1 — Call Performance */}
            <div className={sectionCls}>
              <h3 className="text-xs font-medium text-[#C17B2A] uppercase tracking-wider mb-4">Call Performance</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Total Calls This Month</label>
                  <input className={inputCls} type="number" value={totalCalls} onChange={(e) => setTotalCalls(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Total Calls Last Month</label>
                  <input className={inputCls} type="number" value={lastMonthCalls} onChange={(e) => setLastMonthCalls(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Guarantee Calls (of 10)</label>
                  <input className={inputCls} type="number" value={guaranteeCalls} onChange={(e) => setGuaranteeCalls(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Days Left in Guarantee</label>
                  <input className={inputCls} type="number" value={guaranteeDaysLeft} onChange={(e) => setGuaranteeDaysLeft(e.target.value)} placeholder="30" />
                </div>
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Top Call Source</label>
                  <select className={inputCls} value={topCallSource} onChange={(e) => setTopCallSource(e.target.value)}>
                    {CALL_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 2 — Ad Performance */}
            <div className={sectionCls}>
              <h3 className="text-xs font-medium text-[#C17B2A] uppercase tracking-wider mb-4">Ad Performance</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Facebook Ad Spend ($)</label>
                  <input className={inputCls} type="number" value={fbSpend} onChange={(e) => setFbSpend(e.target.value)} placeholder="0" />
                </div>
                {(client.tier === 'complete' || client.tier === 'complete_plus') && (
                  <div>
                    <label className="block text-xs text-[#8A8070] mb-1">Google Ad Spend ($)</label>
                    <input className={inputCls} type="number" value={googleSpend} onChange={(e) => setGoogleSpend(e.target.value)} placeholder="0" />
                  </div>
                )}
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Cost per Call ($)</label>
                  <input className={inputCls} type="number" value={costPerCall} onChange={(e) => setCostPerCall(e.target.value)} placeholder="0" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-[#8A8070] mb-1">Best Performing Ad (optional)</label>
                  <input className={inputCls} value={bestAd} onChange={(e) => setBestAd(e.target.value)} placeholder="Brief description of what ad worked best" />
                </div>
              </div>
            </div>

            {/* SECTION 3 — Business Health Score */}
            <div className={sectionCls}>
              <h3 className="text-xs font-medium text-[#C17B2A] uppercase tracking-wider mb-4">Business Health Score</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Score This Month (/100)</label>
                  <input className={inputCls} type="number" value={healthScore} onChange={(e) => setHealthScore(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Score Last Month (/100)</label>
                  <input className={inputCls} type="number" value={lastHealthScore} onChange={(e) => setLastHealthScore(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Weakest Category</label>
                  <select className={inputCls} value={weakestCategory} onChange={(e) => setWeakestCategory(e.target.value)}>
                    {WEAK_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 4 — Agent Activity */}
            {activeAgents.length > 0 && (
              <div className={sectionCls}>
                <h3 className="text-xs font-medium text-[#C17B2A] uppercase tracking-wider mb-4">Agent Activity Summary</h3>
                <div className="space-y-3">
                  {activeAgents.map((a) => (
                    <div key={a.name}>
                      <label className="block text-xs text-[#8A8070] mb-1">{a.name}</label>
                      <input className={inputCls} value={agentSummaries[a.name] || ''} onChange={(e) => setAgentSummaries((p) => ({ ...p, [a.name]: e.target.value }))} placeholder={a.hint} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 5 — Context */}
            <div className={sectionCls}>
              <h3 className="text-xs font-medium text-[#C17B2A] uppercase tracking-wider mb-4">Context for Claude</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">What worked well this month</label>
                  <textarea className={inputCls + ' min-h-[60px]'} value={whatWorked} onChange={(e) => setWhatWorked(e.target.value)} placeholder="e.g. Facebook ads crushed it, 3 five-star reviews..." />
                </div>
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Challenges or issues (optional)</label>
                  <textarea className={inputCls + ' min-h-[50px]'} value={challenges} onChange={(e) => setChallenges(e.target.value)} placeholder="e.g. Call volume dipped mid-month, budget concerns..." />
                </div>
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Anything specific to include (optional)</label>
                  <textarea className={inputCls + ' min-h-[50px]'} value={specific} onChange={(e) => setSpecific(e.target.value)} placeholder="e.g. Mention the new service area expansion..." />
                </div>
              </div>
            </div>

            {/* Generate button */}
            <button onClick={generate} disabled={generating} className={btnPrimary + ' w-full py-3 text-base'}>
              {generating ? '📊 Generating Report...' : '📊 Generate Report'}
            </button>

            {/* ─── REPORT OUTPUT ──────────────────────────────── */}
            {reportText && (
              <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.3)] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-[#F2EDE4]">Generated Report</h3>
                  <div className="flex gap-2">
                    <button onClick={() => { navigator.clipboard.writeText(reportText); showToast('Copied!') }} className={btnSecondary + ' !text-xs !px-3 !py-1.5'}>📋 Copy</button>
                    <button onClick={printReport} className={btnSecondary + ' !text-xs !px-3 !py-1.5'}>🖨️ Print</button>
                    <button onClick={saveReport} className={btnPrimary + ' !text-xs !px-3 !py-1.5'}>💾 Save</button>
                  </div>
                </div>
                <textarea ref={reportRef} className={inputCls + ' min-h-[400px] text-sm leading-relaxed'} value={reportText} onChange={(e) => setReportText(e.target.value)} />
              </div>
            )}

            {/* ─── REPORT HISTORY ─────────────────────────────── */}
            {reports.length > 0 && (
              <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-6">
                <h3 className="text-sm font-medium text-[#F2EDE4] mb-4">Report History</h3>
                <div className="space-y-2">
                  {reports.map((r) => (
                    <div key={r.id} className="flex items-center justify-between bg-[#0E0C0A] rounded-lg px-4 py-3 border border-[rgba(193,123,42,0.1)]">
                      <div>
                        <span className="text-sm text-[#F2EDE4]">{MONTHS[r.reportMonth - 1]} {r.reportYear}</span>
                        <span className="text-[10px] text-[#8A8070] ml-3">
                          Generated {new Date(r.generatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <button onClick={() => loadSavedReport(r)} className="text-xs text-[#C17B2A] hover:text-[#D4892F] transition-colors">View</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center"><p className="text-[#8A8070]">Loading...</p></div>}>
      <ReportsContent />
    </Suspense>
  )
}
