'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface ScraperTarget {
  id: string; name: string; category: string; url: string; priceSelector: string
  targetTable: string; targetField: string; targetRecordId: string
  frequency: string; isActive: boolean; lastScraped: string | null
  lastResult: string | null; lastStatus: string | null
}
interface ScraperLogEntry {
  id: string; targetId: string; result: string | null; status: string
  errorMsg: string | null; scrapedAt: string; target: { name: string }
}

const TABS = ['Targets', 'Run History', 'Add Target'] as const
const CATEGORIES = ['Materials', 'Software Pricing', 'Competitor', 'Inventory', 'Other']
const FREQUENCIES = ['daily', 'weekly', 'monthly']

const initialForm = {
  name: '', category: CATEGORIES[0], url: '', priceSelector: '',
  targetTable: '', targetField: '', targetRecordId: '', frequency: 'weekly',
}

export default function ScraperDashboard() {
  const [tab, setTab] = useState<typeof TABS[number]>('Targets')
  const [targets, setTargets] = useState<ScraperTarget[]>([])
  const [logs, setLogs] = useState<ScraperLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [runningId, setRunningId] = useState('')
  const [runningAll, setRunningAll] = useState(false)
  const [runSummary, setRunSummary] = useState<{ succeeded: number; failed: number; total: number } | null>(null)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [logFilterTarget, setLogFilterTarget] = useState('')
  const [logFilterStatus, setLogFilterStatus] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }))

  const fetchTargets = useCallback(() => {
    fetch('/api/scraper/targets').then((r) => r.json()).then((d) => setTargets(d.targets || [])).catch(() => {})
  }, [])

  const fetchLogs = useCallback(() => {
    const params = new URLSearchParams()
    if (logFilterTarget) params.set('targetId', logFilterTarget)
    if (logFilterStatus) params.set('status', logFilterStatus)
    fetch(`/api/scraper/logs?${params}`).then((r) => r.json()).then((d) => setLogs(d.logs || [])).catch(() => {})
  }, [logFilterTarget, logFilterStatus])

  useEffect(() => {
    Promise.all([
      fetch('/api/scraper/targets').then((r) => r.json()).then((d) => setTargets(d.targets || [])),
      fetch('/api/scraper/logs').then((r) => r.json()).then((d) => setLogs(d.logs || [])),
    ]).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => { if (tab === 'Run History') fetchLogs() }, [tab, fetchLogs])

  const addTarget = async () => {
    if (!form.name || !form.url || !form.priceSelector || !form.targetTable || !form.targetField || !form.targetRecordId) {
      showToast('Fill in all required fields'); return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/scraper/targets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (data.success) { showToast('Target added!'); setForm(initialForm); fetchTargets(); setTab('Targets') }
      else showToast(data.error || 'Failed')
    } catch { showToast('Error') } finally { setSubmitting(false) }
  }

  const updateTarget = async (id: string, updates: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/scraper/targets/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
      const data = await res.json()
      if (data.success) { showToast('Updated'); fetchTargets(); setEditingId(null) }
      else showToast(data.error || 'Failed')
    } catch { showToast('Error') }
  }

  const deleteTarget = async (id: string) => {
    try {
      const res = await fetch(`/api/scraper/targets/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) { showToast('Deleted'); fetchTargets(); setDeleteConfirm(null) }
      else showToast(data.error || 'Failed')
    } catch { showToast('Error') }
  }

  const runTarget = async (id: string) => {
    setRunningId(id)
    try {
      const res = await fetch('/api/scraper/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId: id }) })
      const data = await res.json()
      if (data.success) { showToast(data.results[0]?.status === 'success' ? `Scraped: ${data.results[0].result}` : `Failed: ${data.results[0]?.error}`); fetchTargets(); fetchLogs() }
      else showToast(data.error || 'Failed')
    } catch { showToast('Error') } finally { setRunningId('') }
  }

  const runAllTargets = async () => {
    setRunningAll(true); setRunSummary(null)
    try {
      const res = await fetch('/api/scraper/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runAll: true }) })
      const data = await res.json()
      if (data.success) { setRunSummary(data.summary); fetchTargets(); fetchLogs() }
      else showToast(data.error || 'Failed')
    } catch { showToast('Error') } finally { setRunningAll(false) }
  }

  const testSelector = async () => {
    if (!form.url || !form.priceSelector) { showToast('Enter URL and selector first'); return }
    setTesting(true); setTestResult(null)
    try {
      const res = await fetch('/api/scraper/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ testOnly: true, url: form.url, selector: form.priceSelector }) })
      const data = await res.json()
      if (data.success && data.found) setTestResult(`Found: ${data.result}`)
      else if (data.success) setTestResult('No match found for this selector')
      else setTestResult(`Error: ${data.error}`)
    } catch { setTestResult('Test failed') } finally { setTesting(false) }
  }

  const inputCls = 'w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] transition-colors placeholder:text-[#8A8070]/50'
  const labelCls = 'block text-xs text-[#8A8070] mb-1'

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'

  const statusBadge = (target: ScraperTarget) => {
    if (!target.isActive) return <span className="text-[10px] bg-[#8A8070]/20 text-[#8A8070] px-2 py-0.5 rounded-full">Paused</span>
    if (target.lastStatus === 'failed') return <span className="text-[10px] bg-red-400/20 text-red-400 px-2 py-0.5 rounded-full">Failed</span>
    return <span className="text-[10px] bg-green-400/20 text-green-400 px-2 py-0.5 rounded-full">Active</span>
  }

  if (loading) return <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center text-[#8A8070]">Loading...</div>

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        {toast && <div className="fixed top-6 right-6 bg-[#1E1B16] border border-[#C17B2A]/30 text-[#F2EDE4] text-sm px-5 py-3 rounded-lg shadow-lg z-50">{toast}</div>}

        <div className="mb-8">
          <Link href="/" className="text-xs text-[#8A8070] hover:text-[#C17B2A] transition-colors">&larr; Dashboard</Link>
          <h1 className="text-2xl font-semibold text-[#C17B2A] mt-1">Scraper Engine</h1>
          <p className="text-sm text-[#8A8070]">Universal price & data scraper</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${tab === t ? 'bg-[#C17B2A] text-white' : 'text-[#8A8070] hover:text-[#F2EDE4]'}`}>{t}</button>
          ))}
        </div>

        {/* ═══ Targets Tab ═══ */}
        {tab === 'Targets' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#8A8070]">{targets.length} target{targets.length !== 1 ? 's' : ''}</p>
              <button onClick={runAllTargets} disabled={runningAll} className="bg-[#C17B2A] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#D4892F] disabled:opacity-40 transition-colors">
                {runningAll ? 'Running...' : 'Run All Active Targets'}
              </button>
            </div>
            {runSummary && (
              <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-4 flex gap-6">
                <p className="text-sm text-green-400">{runSummary.succeeded} succeeded</p>
                {runSummary.failed > 0 && <p className="text-sm text-red-400">{runSummary.failed} failed</p>}
                <p className="text-sm text-[#8A8070]">{runSummary.total} total</p>
              </div>
            )}
            {targets.length === 0 ? (
              <p className="text-sm text-[#8A8070] text-center py-8">No scraper targets yet. Add one to get started.</p>
            ) : targets.map((t) => (
              <div key={t.id} className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-[#F2EDE4]">{t.name}</p>
                      {statusBadge(t)}
                      <span className="text-[10px] text-[#8A8070] bg-[#0E0C0A] px-2 py-0.5 rounded">{t.category}</span>
                    </div>
                    <p className="text-xs text-[#8A8070] truncate max-w-[40ch]" title={t.url}>{t.url}</p>
                    <div className="flex gap-4 mt-1 text-[10px] text-[#8A8070]">
                      <span>Freq: {t.frequency}</span>
                      <span>Last: {formatDate(t.lastScraped)}</span>
                      {t.lastResult && <span className="text-[#F2EDE4]">Result: {t.lastResult}</span>}
                    </div>
                    <p className="text-[10px] text-[#8A8070] mt-0.5">
                      {t.targetTable}.{t.targetField} &rarr; {t.targetRecordId}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => runTarget(t.id)} disabled={runningId === t.id} className="text-xs text-[#C17B2A] hover:text-[#D4892F] disabled:opacity-40 whitespace-nowrap">
                      {runningId === t.id ? 'Running...' : 'Scrape Now'}
                    </button>
                    <button onClick={() => updateTarget(t.id, { isActive: !t.isActive })} className="text-xs text-[#8A8070] hover:text-[#F2EDE4] whitespace-nowrap">
                      {t.isActive ? 'Pause' : 'Resume'}
                    </button>
                    <button onClick={() => setEditingId(editingId === t.id ? null : t.id)} className="text-xs text-[#8A8070] hover:text-[#F2EDE4]">Edit</button>
                    {deleteConfirm === t.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => deleteTarget(t.id)} className="text-xs text-red-400 hover:text-red-300">Confirm</button>
                        <button onClick={() => setDeleteConfirm(null)} className="text-xs text-[#8A8070]">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(t.id)} className="text-xs text-red-400/60 hover:text-red-400">Delete</button>
                    )}
                  </div>
                </div>
                {editingId === t.id && (
                  <EditTargetInline target={t} onSave={(updates) => updateTarget(t.id, updates)} onCancel={() => setEditingId(null)} inputCls={inputCls} labelCls={labelCls} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ═══ Run History Tab ═══ */}
        {tab === 'Run History' && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <select className={`${inputCls} w-48`} value={logFilterTarget} onChange={(e) => setLogFilterTarget(e.target.value)}>
                <option value="">All Targets</option>
                {targets.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select className={`${inputCls} w-36`} value={logFilterStatus} onChange={(e) => setLogFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            {logs.length === 0 ? (
              <p className="text-sm text-[#8A8070] text-center py-8">No scrape logs yet.</p>
            ) : logs.map((l) => (
              <div key={l.id} className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#F2EDE4]">{l.target.name}</p>
                  <p className="text-xs text-[#8A8070]">{formatDate(l.scrapedAt)}</p>
                  {l.result && <p className="text-xs text-[#F2EDE4] mt-0.5">Result: {l.result}</p>}
                  {l.errorMsg && <p className="text-xs text-red-400 mt-0.5">{l.errorMsg}</p>}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${l.status === 'success' ? 'bg-green-400/20 text-green-400' : 'bg-red-400/20 text-red-400'}`}>{l.status}</span>
              </div>
            ))}
          </div>
        )}

        {/* ═══ Add Target Tab ═══ */}
        {tab === 'Add Target' && (
          <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Name *</label>
                <input className={inputCls} placeholder="e.g. HD Copper Pipe 3/4" value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Category</label>
                <select className={inputCls} value={form.category} onChange={(e) => set('category', e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>URL *</label>
              <input className={inputCls} placeholder="https://example.com/product" value={form.url} onChange={(e) => set('url', e.target.value)} />
            </div>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className={labelCls}>Price Selector * <span className="text-[#8A8070]/60">(CSS selector)</span></label>
                <input className={inputCls} placeholder=".price, #cost, [data-price]" value={form.priceSelector} onChange={(e) => set('priceSelector', e.target.value)} />
              </div>
              <button onClick={testSelector} disabled={testing} className="border border-[rgba(193,123,42,0.3)] text-[#C17B2A] px-4 py-2.5 rounded-lg text-sm hover:bg-[rgba(193,123,42,0.1)] disabled:opacity-40 transition-colors whitespace-nowrap">
                {testing ? 'Testing...' : 'Test Selector'}
              </button>
            </div>
            {testResult && (
              <div className={`text-sm px-4 py-2 rounded-lg ${testResult.startsWith('Found') ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
                {testResult}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Target Table *</label>
                <input className={inputCls} placeholder="e.g. ColeInventoryItem" value={form.targetTable} onChange={(e) => set('targetTable', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Target Field *</label>
                <input className={inputCls} placeholder="e.g. price" value={form.targetField} onChange={(e) => set('targetField', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Target Record ID *</label>
                <input className={inputCls} placeholder="cuid of the record" value={form.targetRecordId} onChange={(e) => set('targetRecordId', e.target.value)} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Frequency</label>
              <select className={inputCls} value={form.frequency} onChange={(e) => set('frequency', e.target.value)}>
                {FREQUENCIES.map((f) => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
              </select>
            </div>
            <button onClick={addTarget} disabled={submitting} className="bg-[#C17B2A] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] disabled:opacity-40 transition-colors">
              {submitting ? 'Adding...' : 'Add Target'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Inline Edit Component ────────────────────────────────────

function EditTargetInline({ target, onSave, onCancel, inputCls, labelCls }: {
  target: ScraperTarget
  onSave: (updates: Record<string, unknown>) => void
  onCancel: () => void
  inputCls: string
  labelCls: string
}) {
  const [ef, setEf] = useState({
    name: target.name, category: target.category, url: target.url,
    priceSelector: target.priceSelector, targetTable: target.targetTable,
    targetField: target.targetField, targetRecordId: target.targetRecordId,
    frequency: target.frequency,
  })

  return (
    <div className="mt-4 pt-4 border-t border-[rgba(193,123,42,0.1)] space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><label className={labelCls}>Name</label><input className={inputCls} value={ef.name} onChange={(e) => setEf({ ...ef, name: e.target.value })} /></div>
        <div><label className={labelCls}>Category</label><select className={inputCls} value={ef.category} onChange={(e) => setEf({ ...ef, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
        <div className="md:col-span-2"><label className={labelCls}>URL</label><input className={inputCls} value={ef.url} onChange={(e) => setEf({ ...ef, url: e.target.value })} /></div>
        <div><label className={labelCls}>Selector</label><input className={inputCls} value={ef.priceSelector} onChange={(e) => setEf({ ...ef, priceSelector: e.target.value })} /></div>
        <div><label className={labelCls}>Frequency</label><select className={inputCls} value={ef.frequency} onChange={(e) => setEf({ ...ef, frequency: e.target.value })}>{FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}</select></div>
        <div><label className={labelCls}>Target Table</label><input className={inputCls} value={ef.targetTable} onChange={(e) => setEf({ ...ef, targetTable: e.target.value })} /></div>
        <div><label className={labelCls}>Target Field</label><input className={inputCls} value={ef.targetField} onChange={(e) => setEf({ ...ef, targetField: e.target.value })} /></div>
        <div className="md:col-span-2"><label className={labelCls}>Target Record ID</label><input className={inputCls} value={ef.targetRecordId} onChange={(e) => setEf({ ...ef, targetRecordId: e.target.value })} /></div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSave(ef)} className="bg-[#C17B2A] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#D4892F]">Save</button>
        <button onClick={onCancel} className="text-xs text-[#8A8070] hover:text-[#F2EDE4] px-3 py-2">Cancel</button>
      </div>
    </div>
  )
}
