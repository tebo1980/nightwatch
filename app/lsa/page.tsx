'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

// ─── Types ──────────────────────────────────────────────────────────

interface LsaClient { id: string; businessName: string; industry: string; ownerName: string; city: string; state: string }

interface Tracker {
  id: string; clientId: string; status: string
  licenseSubmitted: boolean; licenseVerified: boolean
  insuranceSubmitted: boolean; insuranceVerified: boolean
  ownerBackgroundCheckInitiated: boolean; ownerBackgroundCheckComplete: boolean
  employeeBackgroundChecksComplete: boolean; businessInfoVerified: boolean
  gbpReviewCountAtLaunch: number | null
  applicationSubmittedDate: string | null; estimatedApprovalDate: string | null; activationDate: string | null
  weeklyBudget: number | null; notes: string | null
}

interface PerfEntry {
  id: string; month: number; year: number
  leadsReceived: number; leadsDisputed: number; leadsApproved: number
  weeklyBudget: number | null; totalSpend: number | null; costPerLead: number | null
  jobsBooked: number; revenueGenerated: number | null; notes: string | null
}

// ─── Constants ──────────────────────────────────────────────────────

const STATUS_DISPLAY: Record<string, { label: string; bg: string; text: string; border: string; desc: string }> = {
  not_started: { label: 'Not Started', bg: 'bg-[#1E1B16]', text: 'text-[#8A8070]', border: 'border-[rgba(193,123,42,0.15)]', desc: 'LSA setup has not been started for this client.' },
  in_progress: { label: 'In Progress', bg: 'bg-[#C17B2A]/10', text: 'text-[#C17B2A]', border: 'border-[#C17B2A]/30', desc: 'LSA verification is in progress. Check the checklist below for remaining items.' },
  submitted: { label: 'Submitted', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', desc: 'Application submitted. Approval typically takes 3 to 4 weeks after all documents are verified.' },
  active: { label: 'Active', bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', desc: 'LSA is live and generating leads for this client.' },
}

const DOC_ITEMS: { key: keyof Tracker; label: string }[] = [
  { key: 'licenseSubmitted', label: 'Trade license submitted to Google' },
  { key: 'licenseVerified', label: 'Trade license verified by Google' },
  { key: 'insuranceSubmitted', label: 'General liability insurance submitted' },
  { key: 'insuranceVerified', label: 'General liability insurance verified' },
  { key: 'ownerBackgroundCheckInitiated', label: 'Owner background check initiated' },
  { key: 'ownerBackgroundCheckComplete', label: 'Owner background check complete' },
  { key: 'employeeBackgroundChecksComplete', label: 'All field employee background checks complete' },
  { key: 'businessInfoVerified', label: 'Business name, address, and phone verified and matching GBP exactly' },
]

const PRELAUNCH_ITEMS = [
  { key: 'gbpReviews', label: 'Google Business Profile has at least 10 reviews' },
  { key: 'gbpComplete', label: 'GBP profile is fully complete and optimized' },
  { key: 'gbpResponse', label: 'Response rate on GBP messages is above 90 percent' },
  { key: 'businessHours', label: 'Business hours are accurate and up to date' },
  { key: 'serviceArea', label: 'Service area is defined and limited to profitable zip codes' },
  { key: 'jobTypes', label: 'Job types selected match only high-value work for this client' },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const STATUSES = ['not_started', 'in_progress', 'submitted', 'active']

const inputCls = 'w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] transition-colors placeholder:text-[#8A8070]/50'
const btnPrimary = 'bg-[#C17B2A] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-50'
const btnSecondary = 'border border-[rgba(193,123,42,0.3)] text-[#C17B2A] px-4 py-2 rounded-lg text-sm hover:bg-[rgba(193,123,42,0.1)] transition-colors'

// ─── Main Content ───────────────────────────────────────────────────

function LsaContent() {
  const searchParams = useSearchParams()
  const clientId = searchParams.get('clientId')

  const [client, setClient] = useState<LsaClient | null>(null)
  const [tracker, setTracker] = useState<Tracker | null>(null)
  const [perf, setPerf] = useState<PerfEntry[]>([])
  const [prelaunch, setPrelaunch] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [toast, setToast] = useState('')

  // Perf form
  const [showPerfForm, setShowPerfForm] = useState(false)
  const [editingPerfId, setEditingPerfId] = useState<string | null>(null)
  const [pf, setPf] = useState({ month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()), leadsReceived: '', leadsDisputed: '', leadsApproved: '', weeklyBudget: '', totalSpend: '', costPerLead: '', jobsBooked: '', revenueGenerated: '', notes: '' })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const load = useCallback(() => {
    if (!clientId) { setLoading(false); return }
    setLoading(true)
    fetch(`/api/lsa?clientId=${clientId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(true); return }
        setClient(data.client)
        setTracker(data.tracker)
        setPerf(data.performance || [])
        // Load prelaunch from localStorage
        try {
          const stored = localStorage.getItem(`lsa_prelaunch_${clientId}`)
          if (stored) setPrelaunch(JSON.parse(stored))
        } catch { /* */ }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [clientId])

  useEffect(() => { load() }, [load])

  // Toggle tracker checkbox
  const toggleTracker = async (field: keyof Tracker) => {
    if (!tracker || !clientId) return
    const newVal = !tracker[field]
    setTracker((prev) => prev ? { ...prev, [field]: newVal } : prev)
    await fetch('/api/lsa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_tracker', clientId, [field]: newVal }),
    })
  }

  // Toggle prelaunch (localStorage)
  const togglePrelaunch = (key: string) => {
    const updated = { ...prelaunch, [key]: !prelaunch[key] }
    setPrelaunch(updated)
    if (clientId) localStorage.setItem(`lsa_prelaunch_${clientId}`, JSON.stringify(updated))
  }

  // Update status
  const updateStatus = async (newStatus: string) => {
    if (!clientId) return
    setTracker((prev) => prev ? { ...prev, status: newStatus } : prev)
    await fetch('/api/lsa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_tracker', clientId, status: newStatus }),
    })
    showToast(`Status: ${STATUS_DISPLAY[newStatus]?.label}`)
  }

  // Save perf entry
  const savePerf = async () => {
    if (!clientId) return
    await fetch('/api/lsa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_performance', clientId, ...pf }),
    })
    setShowPerfForm(false)
    setEditingPerfId(null)
    setPf({ month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()), leadsReceived: '', leadsDisputed: '', leadsApproved: '', weeklyBudget: '', totalSpend: '', costPerLead: '', jobsBooked: '', revenueGenerated: '', notes: '' })
    showToast('Entry saved!')
    load()
  }

  const editPerf = (e: PerfEntry) => {
    setEditingPerfId(e.id)
    setPf({ month: String(e.month), year: String(e.year), leadsReceived: String(e.leadsReceived), leadsDisputed: String(e.leadsDisputed), leadsApproved: String(e.leadsApproved), weeklyBudget: e.weeklyBudget?.toString() || '', totalSpend: e.totalSpend?.toString() || '', costPerLead: e.costPerLead?.toString() || '', jobsBooked: String(e.jobsBooked), revenueGenerated: e.revenueGenerated?.toString() || '', notes: e.notes || '' })
    setShowPerfForm(true)
  }

  // Stats
  const totalLeads = perf.reduce((s, e) => s + e.leadsReceived, 0)
  const totalSpendAll = perf.reduce((s, e) => s + (e.totalSpend || 0), 0)
  const avgCPL = totalLeads > 0 ? totalSpendAll / totalLeads : 0
  const totalRevenue = perf.reduce((s, e) => s + (e.revenueGenerated || 0), 0)

  // ─── Renders ──────────────────────────────────────────────

  if (!clientId) {
    return (
      <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-4xl mb-4">📋</p>
          <h1 className="text-lg font-medium text-[#F2EDE4] mb-2">LSA Setup Tracker</h1>
          <p className="text-sm text-[#8A8070]">Add <span className="text-[#C17B2A] font-mono">?clientId=</span> to the URL to load a client.</p>
        </div>
      </div>
    )
  }

  if (loading) return <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center text-[#8A8070]">Loading...</div>
  if (error || !client || !tracker) return <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center text-[#8A8070]">Client not found.</div>

  const st = STATUS_DISPLAY[tracker.status] || STATUS_DISPLAY.not_started

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        {toast && <div className="fixed top-6 right-6 bg-[#1E1B16] border border-[#C17B2A]/30 text-[#F2EDE4] text-sm px-5 py-3 rounded-lg shadow-lg z-50">{toast}</div>}

        {/* Header */}
        <div className="mb-6">
          <Link href="/" className="text-xs text-[#8A8070] hover:text-[#C17B2A] transition-colors">&larr; Dashboard</Link>
          <h1 className="text-2xl font-semibold text-[#F2EDE4] mt-1 flex items-center gap-2">
            <span>📋</span> LSA Setup Tracker
          </h1>
          <p className="text-sm text-[#8A8070]">{client.businessName} — {client.industry} — {client.city}, {client.state}</p>
        </div>

        {/* ─── SECTION 1: STATUS BANNER ──────────────────────── */}
        <div className={`${st.bg} border ${st.border} rounded-2xl p-5 mb-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {tracker.status === 'active' && <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />}
              <div>
                <span className={`text-sm font-semibold ${st.text}`}>{st.label}</span>
                <p className="text-xs text-[#8A8070] mt-0.5">{st.desc}</p>
              </div>
            </div>
            <select className="bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-1.5 text-xs text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]"
              value={tracker.status} onChange={(e) => updateStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_DISPLAY[s].label}</option>)}
            </select>
          </div>
        </div>

        {/* ─── SECTION 2: VERIFICATION CHECKLIST ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Documents & Verification */}
          <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-5">
            <h3 className="text-xs font-medium text-[#C17B2A] uppercase tracking-wider mb-4">Documents and Verification</h3>
            <div className="space-y-2">
              {DOC_ITEMS.map((item) => {
                const done = tracker[item.key] as boolean
                return (
                  <label key={item.key} className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" checked={done} onChange={() => toggleTracker(item.key)}
                      className="mt-0.5 w-4 h-4 rounded accent-[#C17B2A]" />
                    <span className={`text-xs leading-relaxed ${done ? 'text-[#8A8070] line-through' : 'text-[#F2EDE4] group-hover:text-[#C17B2A]'} transition-colors`}>
                      {item.label}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Pre-Launch Requirements */}
          <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-5">
            <h3 className="text-xs font-medium text-[#C17B2A] uppercase tracking-wider mb-4">Pre-Launch Requirements</h3>
            <div className="space-y-2">
              {PRELAUNCH_ITEMS.map((item) => {
                const done = prelaunch[item.key] || false
                return (
                  <label key={item.key} className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" checked={done} onChange={() => togglePrelaunch(item.key)}
                      className="mt-0.5 w-4 h-4 rounded accent-[#C17B2A]" />
                    <span className={`text-xs leading-relaxed ${done ? 'text-[#8A8070] line-through' : 'text-[#F2EDE4] group-hover:text-[#C17B2A]'} transition-colors`}>
                      {item.label}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-[#0E0C0A] border border-[rgba(193,123,42,0.1)] rounded-xl p-4">
            <p className="text-[10px] text-[#C17B2A] font-medium mb-2">Timeline Reminder</p>
            <p className="text-[11px] text-[#8A8070] leading-relaxed">
              LSA approval typically takes 3 to 4 weeks after all documents are verified. Missing or mismatched information between the license, insurance, GBP, and website can extend this significantly. Submit everything at once and double-check that the business name, address, and phone number match exactly across all sources.
            </p>
          </div>
          <div className="bg-[#0E0C0A] border border-[rgba(193,123,42,0.1)] rounded-xl p-4">
            <p className="text-[10px] text-[#C17B2A] font-medium mb-2">Review Minimum Warning</p>
            <p className="text-[11px] text-[#8A8070] leading-relaxed">
              Google uses review count and rating as a ranking factor in LSA. Launching with fewer than 10 reviews means your ads will appear but rank below competitors with more reviews. Aim for at least 15 to 20 reviews before activating spend for best results.
            </p>
          </div>
        </div>

        {/* ─── SECTION 3: PERFORMANCE TRACKER ────────────────── */}
        <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium text-[#F2EDE4] flex items-center gap-2">
              <span>📈</span> LSA Performance
            </h2>
            <button onClick={() => { setShowPerfForm(!showPerfForm); setEditingPerfId(null) }} className={btnSecondary + ' !text-xs'}>
              {showPerfForm ? 'Cancel' : '+ New Month Entry'}
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-[#0E0C0A] rounded-lg p-3 border border-[rgba(193,123,42,0.1)]">
              <div className="text-lg font-semibold text-[#C17B2A]">{totalLeads}</div>
              <div className="text-[10px] text-[#8A8070]">Total LSA Leads</div>
            </div>
            <div className="bg-[#0E0C0A] rounded-lg p-3 border border-[rgba(193,123,42,0.1)]">
              <div className="text-lg font-semibold text-[#C17B2A]">${avgCPL.toFixed(0)}</div>
              <div className="text-[10px] text-[#8A8070]">Avg Cost Per Lead</div>
            </div>
            <div className="bg-[#0E0C0A] rounded-lg p-3 border border-[rgba(193,123,42,0.1)]">
              <div className="text-lg font-semibold text-green-400">${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div className="text-[10px] text-[#8A8070]">Total Revenue (LSA)</div>
            </div>
          </div>

          {/* Perf form */}
          {showPerfForm && (
            <div className="bg-[#0E0C0A] rounded-xl p-4 border border-[rgba(193,123,42,0.15)] mb-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Month</label>
                  <select className={inputCls} value={pf.month} onChange={(e) => setPf((p) => ({ ...p, month: e.target.value }))}>
                    {MONTHS.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Year</label>
                  <select className={inputCls} value={pf.year} onChange={(e) => setPf((p) => ({ ...p, year: e.target.value }))}>
                    {['2025', '2026', '2027'].map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Leads Received</label>
                  <input className={inputCls} type="number" value={pf.leadsReceived} onChange={(e) => setPf((p) => ({ ...p, leadsReceived: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Leads Disputed</label>
                  <input className={inputCls} type="number" value={pf.leadsDisputed} onChange={(e) => setPf((p) => ({ ...p, leadsDisputed: e.target.value }))} placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Leads Approved</label>
                  <input className={inputCls} type="number" value={pf.leadsApproved} onChange={(e) => setPf((p) => ({ ...p, leadsApproved: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Total Spend ($)</label>
                  <input className={inputCls} type="number" value={pf.totalSpend} onChange={(e) => setPf((p) => ({ ...p, totalSpend: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Cost Per Lead ($)</label>
                  <input className={inputCls} type="number" value={pf.costPerLead} onChange={(e) => setPf((p) => ({ ...p, costPerLead: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Weekly Budget ($)</label>
                  <input className={inputCls} type="number" value={pf.weeklyBudget} onChange={(e) => setPf((p) => ({ ...p, weeklyBudget: e.target.value }))} placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Jobs Booked</label>
                  <input className={inputCls} type="number" value={pf.jobsBooked} onChange={(e) => setPf((p) => ({ ...p, jobsBooked: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Revenue Generated ($)</label>
                  <input className={inputCls} type="number" value={pf.revenueGenerated} onChange={(e) => setPf((p) => ({ ...p, revenueGenerated: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Notes</label>
                  <input className={inputCls} value={pf.notes} onChange={(e) => setPf((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional..." />
                </div>
              </div>
              <button onClick={savePerf} className={btnPrimary + ' !text-xs'}>
                {editingPerfId ? 'Update Entry' : 'Save Entry'}
              </button>
            </div>
          )}

          {/* Performance table */}
          {perf.length === 0 ? (
            <p className="text-xs text-[#8A8070] py-4">No performance data yet. Add a month entry after LSA is active.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#8A8070] border-b border-[rgba(193,123,42,0.1)]">
                    <th className="text-left py-2 pr-2 font-medium">Month</th>
                    <th className="text-right py-2 px-2 font-medium">Leads</th>
                    <th className="text-right py-2 px-2 font-medium">Disputed</th>
                    <th className="text-right py-2 px-2 font-medium">Approved</th>
                    <th className="text-right py-2 px-2 font-medium">Spend</th>
                    <th className="text-right py-2 px-2 font-medium">CPL</th>
                    <th className="text-right py-2 px-2 font-medium">Jobs</th>
                    <th className="text-right py-2 px-2 font-medium">Revenue</th>
                    <th className="text-right py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {perf.map((e) => (
                    <tr key={e.id} className="border-b border-[rgba(193,123,42,0.05)] hover:bg-[rgba(193,123,42,0.02)]">
                      <td className="py-2.5 pr-2 text-[#F2EDE4]">{MONTHS[e.month - 1]} {e.year}</td>
                      <td className="py-2.5 px-2 text-right text-[#F2EDE4]">{e.leadsReceived}</td>
                      <td className="py-2.5 px-2 text-right text-red-400">{e.leadsDisputed}</td>
                      <td className="py-2.5 px-2 text-right text-green-400">{e.leadsApproved}</td>
                      <td className="py-2.5 px-2 text-right text-[#8A8070]">{e.totalSpend ? `$${e.totalSpend.toFixed(0)}` : '—'}</td>
                      <td className="py-2.5 px-2 text-right text-[#C17B2A]">{e.costPerLead ? `$${e.costPerLead.toFixed(0)}` : '—'}</td>
                      <td className="py-2.5 px-2 text-right text-[#F2EDE4]">{e.jobsBooked}</td>
                      <td className="py-2.5 px-2 text-right text-green-400">{e.revenueGenerated ? `$${e.revenueGenerated.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}</td>
                      <td className="py-2.5 text-right">
                        <button onClick={() => editPerf(e)} className="text-[10px] text-[#C17B2A] hover:text-[#D4892F]">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tip card */}
          <div className="bg-[#C17B2A]/5 border border-[#C17B2A]/15 rounded-lg p-3 mt-4">
            <p className="text-[11px] text-[#C17B2A]/80 leading-relaxed">
              Dispute every lead that is spam, wrong service, or out of area. Google credits disputed leads that qualify. Reviewing call recordings monthly and disputing aggressively can reduce effective cost per lead by 15 to 30 percent on well-managed accounts.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LsaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center"><p className="text-[#8A8070]">Loading...</p></div>}>
      <LsaContent />
    </Suspense>
  )
}
