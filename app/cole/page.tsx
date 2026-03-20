'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface AgentClientBasic { id: string; businessName: string; coleEnabled: boolean }
interface Expense { id: string; date: string; vendor: string; category: string; description: string; amount: number; jobReference: string | null }
interface Job { id: string; date: string; jobName: string; jobType: string; revenue: number; notes: string | null }

const TABS = ['Expenses', 'Job Revenue', 'Cost Report'] as const
const CATEGORIES = ['Materials', 'Supplies', 'Equipment', 'Subcontractor', 'Other']
const JOB_TYPES = ['Repair', 'Install', 'Maintenance', 'Inspection', 'Other']

export default function ColeDashboard() {
  const [clients, setClients] = useState<AgentClientBasic[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [tab, setTab] = useState<typeof TABS[number]>('Expenses')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [jobs, setJobs] = useState<Job[]>([])

  const [showExpForm, setShowExpForm] = useState(false)
  const [showJobForm, setShowJobForm] = useState(false)
  const [ef, setEf] = useState({ date: '', vendor: '', category: CATEGORIES[0], description: '', amount: '', jobReference: '' })
  const [jf, setJf] = useState({ date: '', jobName: '', jobType: JOB_TYPES[0], revenue: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)

  const [reportMonth, setReportMonth] = useState(new Date().getMonth())
  const [reportYear, setReportYear] = useState(new Date().getFullYear())
  const [reportText, setReportText] = useState('')
  const [reportStats, setReportStats] = useState<{ totalRevenue: number; totalExpenses: number; margin: number; vendorSpikes: { vendor: string; current: number; previous: number }[] } | null>(null)
  const [generatingReport, setGeneratingReport] = useState(false)

  useEffect(() => {
    fetch('/api/agent-clients').then((r) => r.json()).then((data) => {
      const cc = (data.clients || []).filter((c: AgentClientBasic) => c.coleEnabled)
      setClients(cc)
      if (cc.length > 0) setSelectedClientId(cc[0].id)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const fetchData = useCallback(() => {
    if (!selectedClientId) return
    fetch(`/api/cole/expenses?clientId=${selectedClientId}`).then((r) => r.json()).then((d) => setExpenses(d.expenses || [])).catch(() => {})
    fetch(`/api/cole/revenue?clientId=${selectedClientId}`).then((r) => r.json()).then((d) => setJobs(d.jobs || [])).catch(() => {})
  }, [selectedClientId])

  useEffect(() => { fetchData() }, [fetchData])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  // Current month summaries
  const now = new Date()
  const thisMonthExpenses = expenses.filter((e) => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
  const thisMonthJobs = jobs.filter((j) => { const d = new Date(j.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
  const monthExpTotal = thisMonthExpenses.reduce((s, e) => s + e.amount, 0)
  const monthRevTotal = thisMonthJobs.reduce((s, j) => s + j.revenue, 0)

  const topVendor = thisMonthExpenses.length > 0 ? Object.entries(thisMonthExpenses.reduce((acc, e) => { acc[e.vendor] = (acc[e.vendor] || 0) + e.amount; return acc }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1])[0]?.[0] || '-' : '-'
  const topCategory = thisMonthExpenses.length > 0 ? Object.entries(thisMonthExpenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1])[0]?.[0] || '-' : '-'

  // Vendor spike detection for alerts
  const lastMonthExpenses = expenses.filter((e) => { const d = new Date(e.date); return d.getMonth() === now.getMonth() - 1 && d.getFullYear() === now.getFullYear() })
  const curVendors: Record<string, number> = {}; thisMonthExpenses.forEach((e) => { curVendors[e.vendor] = (curVendors[e.vendor] || 0) + e.amount })
  const prevVendors: Record<string, number> = {}; lastMonthExpenses.forEach((e) => { prevVendors[e.vendor] = (prevVendors[e.vendor] || 0) + e.amount })
  const costSpikes = Object.entries(curVendors).filter(([v, amt]) => prevVendors[v] && amt > prevVendors[v] * 1.15)

  const submitExpense = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/cole/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: selectedClientId, ...ef }) })
      const data = await res.json()
      if (data.success) { showToast('Expense added!'); setShowExpForm(false); setEf({ date: '', vendor: '', category: CATEGORIES[0], description: '', amount: '', jobReference: '' }); fetchData() }
      else showToast(data.error || 'Failed')
    } catch { showToast('Error') } finally { setSubmitting(false) }
  }

  const submitJob = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/cole/revenue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: selectedClientId, ...jf }) })
      const data = await res.json()
      if (data.success) { showToast('Job added!'); setShowJobForm(false); setJf({ date: '', jobName: '', jobType: JOB_TYPES[0], revenue: '', notes: '' }); fetchData() }
      else showToast(data.error || 'Failed')
    } catch { showToast('Error') } finally { setSubmitting(false) }
  }

  const generateReport = async () => {
    setGeneratingReport(true); setReportText(''); setReportStats(null)
    try {
      const res = await fetch('/api/cole/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: selectedClientId, month: reportMonth, year: reportYear }) })
      const data = await res.json()
      if (data.success) { setReportText(data.report); setReportStats(data.stats); showToast('Report generated!') }
      else showToast(data.error || 'Failed')
    } catch { showToast('Error') } finally { setGeneratingReport(false) }
  }

  const inputCls = 'w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] transition-colors placeholder:text-[#8A8070]/50'

  if (loading) return <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center text-[#8A8070]">Loading...</div>

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        {toast && <div className="fixed top-6 right-6 bg-[#1E1B16] border border-[#C17B2A]/30 text-[#F2EDE4] text-sm px-5 py-3 rounded-lg shadow-lg z-50">{toast}</div>}

        <div className="mb-8">
          <Link href="/" className="text-xs text-[#8A8070] hover:text-[#C17B2A] transition-colors">&larr; Dashboard</Link>
          <h1 className="text-2xl font-semibold text-[#C17B2A] mt-1">Cole</h1>
          <p className="text-sm text-[#8A8070]">Cost of Goods & Inventory</p>
        </div>

        <div className="mb-6">
          <select className="bg-[#1E1B16] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] w-full md:w-72" value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}>
            {clients.length === 0 && <option value="">No Cole-enabled clients</option>}
            {clients.map((c) => <option key={c.id} value={c.id}>{c.businessName}</option>)}
          </select>
        </div>

        {/* Cost Alerts */}
        <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-4 mb-6">
          {costSpikes.length === 0 ? (
            <p className="text-sm text-green-400">No unusual cost changes detected</p>
          ) : (
            <div>
              <p className="text-sm text-[#C17B2A] font-medium mb-2">Cost Alerts</p>
              {costSpikes.map(([v]) => <p key={v} className="text-xs text-[#F2EDE4]">{v} — <span className="text-[#C17B2A]">Cost Spike</span></p>)}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${tab === t ? 'bg-[#C17B2A] text-white' : 'text-[#8A8070] hover:text-[#F2EDE4]'}`}>{t}</button>
          ))}
        </div>

        {/* Expenses Tab */}
        {tab === 'Expenses' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-3 text-center">
                <p className="text-lg font-semibold text-[#C17B2A]">${monthExpTotal.toFixed(0)}</p>
                <p className="text-[10px] text-[#8A8070]">This Month</p>
              </div>
              <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-3 text-center">
                <p className="text-lg font-semibold text-[#F2EDE4]">{topVendor}</p>
                <p className="text-[10px] text-[#8A8070]">Top Vendor</p>
              </div>
              <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-3 text-center">
                <p className="text-lg font-semibold text-[#F2EDE4]">{topCategory}</p>
                <p className="text-[10px] text-[#8A8070]">Top Category</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setShowExpForm(!showExpForm)} className="bg-[#C17B2A] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#D4892F] transition-colors">Add Expense</button>
            </div>
            {showExpForm && (
              <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-5 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input className={inputCls} type="date" value={ef.date} onChange={(e) => setEf({ ...ef, date: e.target.value })} />
                  <input className={inputCls} placeholder="Vendor name" value={ef.vendor} onChange={(e) => setEf({ ...ef, vendor: e.target.value })} />
                  <select className={inputCls} value={ef.category} onChange={(e) => setEf({ ...ef, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
                  <input className={inputCls} placeholder="Description" value={ef.description} onChange={(e) => setEf({ ...ef, description: e.target.value })} />
                  <input className={inputCls} type="number" step="0.01" placeholder="Amount" value={ef.amount} onChange={(e) => setEf({ ...ef, amount: e.target.value })} />
                  <input className={inputCls} placeholder="Job reference (optional)" value={ef.jobReference} onChange={(e) => setEf({ ...ef, jobReference: e.target.value })} />
                </div>
                <button onClick={submitExpense} disabled={submitting || !ef.date || !ef.vendor || !ef.description} className="bg-[#C17B2A] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#D4892F] disabled:opacity-40">{submitting ? 'Adding...' : 'Add Expense'}</button>
              </div>
            )}
            {expenses.length === 0 ? <p className="text-sm text-[#8A8070] text-center py-8">No expenses yet.</p> : expenses.slice(0, 30).map((e) => (
              <div key={e.id} className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#F2EDE4]">{e.vendor} — {e.description}</p>
                  <p className="text-xs text-[#8A8070]">{new Date(e.date).toLocaleDateString()} — {e.category}{e.jobReference ? ` — Job: ${e.jobReference}` : ''}</p>
                  {costSpikes.some(([v]) => v === e.vendor) && <span className="text-[10px] text-[#C17B2A]">Cost Spike</span>}
                </div>
                <p className="text-sm font-medium text-[#C17B2A]">${e.amount.toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Job Revenue Tab */}
        {tab === 'Job Revenue' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-3 text-center">
                <p className="text-lg font-semibold text-green-400">${monthRevTotal.toFixed(0)}</p>
                <p className="text-[10px] text-[#8A8070]">This Month Revenue</p>
              </div>
              <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-3 text-center">
                <p className="text-lg font-semibold text-[#F2EDE4]">{thisMonthJobs.length}</p>
                <p className="text-[10px] text-[#8A8070]">Job Count</p>
              </div>
              <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-3 text-center">
                <p className="text-lg font-semibold text-[#F2EDE4]">${thisMonthJobs.length > 0 ? (monthRevTotal / thisMonthJobs.length).toFixed(0) : '0'}</p>
                <p className="text-[10px] text-[#8A8070]">Avg Job Value</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setShowJobForm(!showJobForm)} className="bg-[#C17B2A] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#D4892F] transition-colors">Add Job</button>
            </div>
            {showJobForm && (
              <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-5 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input className={inputCls} type="date" value={jf.date} onChange={(e) => setJf({ ...jf, date: e.target.value })} />
                  <input className={inputCls} placeholder="Job name/description" value={jf.jobName} onChange={(e) => setJf({ ...jf, jobName: e.target.value })} />
                  <select className={inputCls} value={jf.jobType} onChange={(e) => setJf({ ...jf, jobType: e.target.value })}>{JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                  <input className={inputCls} type="number" step="0.01" placeholder="Revenue amount" value={jf.revenue} onChange={(e) => setJf({ ...jf, revenue: e.target.value })} />
                  <input className={inputCls} placeholder="Notes (optional)" value={jf.notes} onChange={(e) => setJf({ ...jf, notes: e.target.value })} />
                </div>
                <button onClick={submitJob} disabled={submitting || !jf.date || !jf.jobName} className="bg-[#C17B2A] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#D4892F] disabled:opacity-40">{submitting ? 'Adding...' : 'Add Job'}</button>
              </div>
            )}
            {jobs.length === 0 ? <p className="text-sm text-[#8A8070] text-center py-8">No job revenue entries yet.</p> : jobs.slice(0, 30).map((j) => (
              <div key={j.id} className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#F2EDE4]">{j.jobName}</p>
                  <p className="text-xs text-[#8A8070]">{new Date(j.date).toLocaleDateString()} — {j.jobType}{j.notes ? ` — ${j.notes}` : ''}</p>
                </div>
                <p className="text-sm font-medium text-green-400">${j.revenue.toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Cost Report Tab */}
        {tab === 'Cost Report' && (
          <div className="space-y-4">
            <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-5 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select className={inputCls} value={reportMonth} onChange={(e) => setReportMonth(Number(e.target.value))}>
                  {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select className={inputCls} value={reportYear} onChange={(e) => setReportYear(Number(e.target.value))}>
                  {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <button onClick={generateReport} disabled={generatingReport} className="bg-[#C17B2A] text-white px-5 py-2.5 rounded-lg text-sm hover:bg-[#D4892F] disabled:opacity-40">{generatingReport ? 'Generating...' : 'Generate Cost Report'}</button>
              </div>
            </div>
            {reportStats && (
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-3 text-center">
                  <p className="text-lg font-semibold text-green-400">${reportStats.totalRevenue.toFixed(0)}</p>
                  <p className="text-[10px] text-[#8A8070]">Revenue</p>
                </div>
                <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-3 text-center">
                  <p className="text-lg font-semibold text-[#C17B2A]">${reportStats.totalExpenses.toFixed(0)}</p>
                  <p className="text-[10px] text-[#8A8070]">Expenses</p>
                </div>
                <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-3 text-center">
                  <p className="text-lg font-semibold text-[#F2EDE4]">${(reportStats.totalRevenue - reportStats.totalExpenses).toFixed(0)}</p>
                  <p className="text-[10px] text-[#8A8070]">Net</p>
                </div>
                <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-3 text-center">
                  <p className={`text-lg font-semibold ${reportStats.margin > 30 ? 'text-green-400' : reportStats.margin > 15 ? 'text-yellow-400' : 'text-red-400'}`}>{reportStats.margin.toFixed(1)}%</p>
                  <p className="text-[10px] text-[#8A8070]">Margin</p>
                </div>
              </div>
            )}
            {reportText && (
              <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-medium text-[#F2EDE4]">Cost Intelligence Report</h3>
                  <button onClick={() => navigator.clipboard.writeText(reportText).then(() => showToast('Copied!'))} className="text-xs text-[#C17B2A] hover:text-[#D4892F]">Copy</button>
                </div>
                <p className="text-sm text-[#F2EDE4] whitespace-pre-line leading-relaxed">{reportText}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
