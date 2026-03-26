'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface AgentClientBasic { id: string; businessName: string; maxEnabled: boolean }

interface JobData {
  id: string; customerName: string; customerEmail: string | null; customerPhone: string | null
  serviceProvided: string; jobValue: number | null; completedAt: string; notes: string | null
  reviewRequested: boolean; reviewRequestedAt: string | null; reviewReceived: boolean; createdAt: string
}

interface ReminderData { id: string; reminderNum: number; message: string; sentAt: string | null; status: string }

interface InvoiceData {
  id: string; customerName: string; customerEmail: string | null; customerPhone: string | null
  invoiceNumber: string | null; amount: number; description: string | null; dueDate: string
  paidAt: string | null; status: string; remindersCount: number; lastReminderAt: string | null
  reminders: ReminderData[]
}

type ActiveTab = 'jobs' | 'invoices'

export default function MaxDashboard() {
  const [clients, setClients] = useState<AgentClientBasic[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [jobs, setJobs] = useState<JobData[]>([])
  const [invoices, setInvoices] = useState<InvoiceData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ActiveTab>('jobs')
  const [processing, setProcessing] = useState(false)
  const [toast, setToast] = useState('')
  const [showAddJob, setShowAddJob] = useState(false)
  const [showAddInvoice, setShowAddInvoice] = useState(false)
  const [newJob, setNewJob] = useState({ customerName: '', customerEmail: '', customerPhone: '', serviceProvided: '', jobValue: '', completedAt: '', notes: '' })
  const [newInvoice, setNewInvoice] = useState({ customerName: '', customerEmail: '', customerPhone: '', invoiceNumber: '', amount: '', description: '', dueDate: '' })

  useEffect(() => {
    fetch('/api/agent-clients')
      .then((r) => r.json())
      .then((data) => {
        const maxClients = (data.clients || []).filter((c: AgentClientBasic) => c.maxEnabled)
        setClients(maxClients)
        if (maxClients.length > 0) setSelectedClientId(maxClients[0].id)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const fetchData = useCallback(() => {
    if (!selectedClientId) return
    fetch(`/api/max/jobs?clientId=${selectedClientId}`).then((r) => r.json()).then((d) => setJobs(d.jobs || [])).catch(() => {})
    fetch(`/api/max/invoices?clientId=${selectedClientId}`).then((r) => r.json()).then((d) => setInvoices(d.invoices || [])).catch(() => {})
  }, [selectedClientId])

  useEffect(() => { fetchData() }, [fetchData])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const handleProcess = async () => {
    setProcessing(true)
    try {
      const res = await fetch('/api/max/process', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        showToast(`${data.reviewRequests} review request${data.reviewRequests !== 1 ? 's' : ''}, ${data.paymentReminders} reminder${data.paymentReminders !== 1 ? 's' : ''} sent`)
        fetchData()
      } else { showToast('Process failed.') }
    } catch { showToast('Process error.') }
    finally { setProcessing(false) }
  }

  const handleMarkPaid = async (invoiceId: string) => {
    try {
      const res = await fetch('/api/max/mark-paid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invoiceId }) })
      if ((await res.json()).success) { showToast('Marked as paid!'); fetchData() }
    } catch { showToast('Failed.') }
  }

  const handleAddJob = async () => {
    if (!selectedClientId || !newJob.customerName || !newJob.serviceProvided || !newJob.completedAt) return
    try {
      const res = await fetch('/api/max/add-job', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newJob, clientId: selectedClientId }) })
      if ((await res.json()).success) { showToast('Job added!'); setNewJob({ customerName: '', customerEmail: '', customerPhone: '', serviceProvided: '', jobValue: '', completedAt: '', notes: '' }); setShowAddJob(false); fetchData() }
    } catch { showToast('Failed to add job.') }
  }

  const handleAddInvoice = async () => {
    if (!selectedClientId || !newInvoice.customerName || !newInvoice.amount || !newInvoice.dueDate) return
    try {
      const res = await fetch('/api/max/add-invoice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newInvoice, clientId: selectedClientId }) })
      if ((await res.json()).success) { showToast('Invoice added!'); setNewInvoice({ customerName: '', customerEmail: '', customerPhone: '', invoiceNumber: '', amount: '', description: '', dueDate: '' }); setShowAddInvoice(false); fetchData() }
    } catch { showToast('Failed to add invoice.') }
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const reviewsSent = jobs.filter((j) => j.reviewRequested).length
  const reviewsReceived = jobs.filter((j) => j.reviewReceived).length
  const unpaidInvoices = invoices.filter((i) => i.status === 'unpaid')
  const totalOutstanding = unpaidInvoices.reduce((s, i) => s + i.amount, 0)
  const overdueCount = unpaidInvoices.filter((i) => new Date(i.dueDate) < now).length
  const paidThisMonth = invoices.filter((i) => i.status === 'paid' && i.paidAt && new Date(i.paidAt) >= monthStart).reduce((s, i) => s + i.amount, 0)

  const inputCls = 'w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] transition-colors placeholder:text-[#8A8070]/50'

  const daysOverdue = (dueDate: string) => {
    const d = Math.floor((now.getTime() - new Date(dueDate).getTime()) / 86400000)
    return d > 0 ? d : 0
  }

  if (loading) return <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center text-[#8A8070]">Loading...</div>

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        {toast && <div className="fixed top-6 right-6 bg-[#1E1B16] border border-[#C17B2A]/30 text-[#F2EDE4] text-sm px-5 py-3 rounded-lg shadow-lg z-50">{toast}</div>}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <Link href="/" className="text-xs text-[#8A8070] hover:text-[#C17B2A] transition-colors">&larr; Dashboard</Link>
            <h1 className="text-2xl font-semibold text-[#F2EDE4] mt-1">Max — Back Office Agent</h1>
            <p className="text-sm text-[#8A8070]">Review requests, payment reminders, follow-ups</p>
          </div>
          <button onClick={handleProcess} disabled={processing} className="bg-[#C17B2A] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-50">
            {processing ? 'Processing...' : 'Process Max Now'}
          </button>
        </div>

        {/* Client Selector */}
        <div className="mb-6">
          <select className="bg-[#1E1B16] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] w-full md:w-72" value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}>
            {clients.length === 0 && <option value="">No Max-enabled clients</option>}
            {clients.map((c) => <option key={c.id} value={c.id}>{c.businessName}</option>)}
          </select>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#1E1B16] rounded-lg p-1 w-fit">
          <button onClick={() => setActiveTab('jobs')} className={`px-5 py-2 rounded-md text-sm transition-colors ${activeTab === 'jobs' ? 'bg-[#C17B2A] text-white' : 'text-[#8A8070] hover:text-[#F2EDE4]'}`}>Jobs & Review Requests</button>
          <button onClick={() => setActiveTab('invoices')} className={`px-5 py-2 rounded-md text-sm transition-colors ${activeTab === 'invoices' ? 'bg-[#C17B2A] text-white' : 'text-[#8A8070] hover:text-[#F2EDE4]'}`}>Invoices & Payments</button>
        </div>

        {/* === JOBS TAB === */}
        {activeTab === 'jobs' && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
                <div className="text-2xl font-semibold text-[#C17B2A]">{jobs.length}</div>
                <div className="text-xs text-[#8A8070] mt-1">Total Jobs</div>
              </div>
              <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
                <div className="text-2xl font-semibold text-[#C17B2A]">{reviewsSent}</div>
                <div className="text-xs text-[#8A8070] mt-1">Review Requests Sent</div>
              </div>
              <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
                <div className="text-2xl font-semibold text-green-400">{reviewsReceived}</div>
                <div className="text-xs text-[#8A8070] mt-1">Reviews Received</div>
              </div>
            </div>

            <button onClick={() => setShowAddJob(!showAddJob)} className="text-sm text-[#C17B2A] hover:text-[#D4892F] transition-colors mb-4">
              {showAddJob ? '— Hide' : '+ Add Job'}
            </button>

            {showAddJob && (
              <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-5 mb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><label className="block text-xs text-[#8A8070] mb-1.5">Customer Name *</label><input className={inputCls} value={newJob.customerName} onChange={(e) => setNewJob((p) => ({ ...p, customerName: e.target.value }))} placeholder="Jane Doe" /></div>
                  <div><label className="block text-xs text-[#8A8070] mb-1.5">Customer Email</label><input className={inputCls} type="email" value={newJob.customerEmail} onChange={(e) => setNewJob((p) => ({ ...p, customerEmail: e.target.value }))} placeholder="jane@example.com" /></div>
                  <div><label className="block text-xs text-[#8A8070] mb-1.5">Customer Phone</label><input className={inputCls} type="tel" value={newJob.customerPhone} onChange={(e) => setNewJob((p) => ({ ...p, customerPhone: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><label className="block text-xs text-[#8A8070] mb-1.5">Service Provided *</label><input className={inputCls} value={newJob.serviceProvided} onChange={(e) => setNewJob((p) => ({ ...p, serviceProvided: e.target.value }))} placeholder="Drain cleaning" /></div>
                  <div><label className="block text-xs text-[#8A8070] mb-1.5">Job Value ($)</label><input className={inputCls} type="number" value={newJob.jobValue} onChange={(e) => setNewJob((p) => ({ ...p, jobValue: e.target.value }))} placeholder="350" /></div>
                  <div><label className="block text-xs text-[#8A8070] mb-1.5">Completed Date *</label><input className={inputCls} type="date" value={newJob.completedAt} onChange={(e) => setNewJob((p) => ({ ...p, completedAt: e.target.value }))} /></div>
                </div>
                <div><label className="block text-xs text-[#8A8070] mb-1.5">Notes</label><input className={inputCls} value={newJob.notes} onChange={(e) => setNewJob((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional notes..." /></div>
                <button onClick={handleAddJob} className="bg-[#C17B2A] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors">Add Job</button>
              </div>
            )}

            <div className="space-y-3">
              {jobs.length === 0 ? <div className="text-center text-[#8A8070] py-12">No jobs yet.</div> : jobs.map((job) => (
                <div key={job.id} className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-[#F2EDE4]">{job.customerName}</span>
                      {job.reviewRequested && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">Review Sent</span>}
                      {job.reviewReceived && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Review Received</span>}
                    </div>
                    <p className="text-xs text-[#8A8070]">{job.serviceProvided} &middot; {new Date(job.completedAt).toLocaleDateString()}</p>
                  </div>
                  {job.jobValue && <span className="text-sm text-[#C17B2A] font-medium">${job.jobValue.toFixed(0)}</span>}
                </div>
              ))}
            </div>
          </>
        )}

        {/* === INVOICES TAB === */}
        {activeTab === 'invoices' && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
                <div className="text-2xl font-semibold text-[#C17B2A]">${totalOutstanding.toFixed(0)}</div>
                <div className="text-xs text-[#8A8070] mt-1">Total Outstanding</div>
              </div>
              <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
                <div className="text-2xl font-semibold text-red-400">{overdueCount}</div>
                <div className="text-xs text-[#8A8070] mt-1">Overdue</div>
              </div>
              <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
                <div className="text-2xl font-semibold text-green-400">${paidThisMonth.toFixed(0)}</div>
                <div className="text-xs text-[#8A8070] mt-1">Paid This Month</div>
              </div>
            </div>

            <button onClick={() => setShowAddInvoice(!showAddInvoice)} className="text-sm text-[#C17B2A] hover:text-[#D4892F] transition-colors mb-4">
              {showAddInvoice ? '— Hide' : '+ Add Invoice'}
            </button>

            {showAddInvoice && (
              <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-5 mb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><label className="block text-xs text-[#8A8070] mb-1.5">Customer Name *</label><input className={inputCls} value={newInvoice.customerName} onChange={(e) => setNewInvoice((p) => ({ ...p, customerName: e.target.value }))} placeholder="Jane Doe" /></div>
                  <div><label className="block text-xs text-[#8A8070] mb-1.5">Customer Email</label><input className={inputCls} type="email" value={newInvoice.customerEmail} onChange={(e) => setNewInvoice((p) => ({ ...p, customerEmail: e.target.value }))} placeholder="jane@example.com" /></div>
                  <div><label className="block text-xs text-[#8A8070] mb-1.5">Invoice Number</label><input className={inputCls} value={newInvoice.invoiceNumber} onChange={(e) => setNewInvoice((p) => ({ ...p, invoiceNumber: e.target.value }))} placeholder="INV-001" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><label className="block text-xs text-[#8A8070] mb-1.5">Amount ($) *</label><input className={inputCls} type="number" value={newInvoice.amount} onChange={(e) => setNewInvoice((p) => ({ ...p, amount: e.target.value }))} placeholder="500" /></div>
                  <div><label className="block text-xs text-[#8A8070] mb-1.5">Due Date *</label><input className={inputCls} type="date" value={newInvoice.dueDate} onChange={(e) => setNewInvoice((p) => ({ ...p, dueDate: e.target.value }))} /></div>
                  <div><label className="block text-xs text-[#8A8070] mb-1.5">Description</label><input className={inputCls} value={newInvoice.description} onChange={(e) => setNewInvoice((p) => ({ ...p, description: e.target.value }))} placeholder="Drain cleaning service" /></div>
                </div>
                <button onClick={handleAddInvoice} className="bg-[#C17B2A] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors">Add Invoice</button>
              </div>
            )}

            <div className="space-y-3">
              {invoices.length === 0 ? <div className="text-center text-[#8A8070] py-12">No invoices yet.</div> : invoices.map((inv) => {
                const overdue = daysOverdue(inv.dueDate)
                const statusColor = inv.status === 'paid' ? 'text-green-400 bg-green-500/20' : overdue >= 15 ? 'text-red-400 bg-red-500/20' : overdue > 0 ? 'text-orange-400 bg-orange-500/20' : 'text-[#8A8070] bg-[#0E0C0A]'
                return (
                  <div key={inv.id} className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-[#F2EDE4]">{inv.customerName}</span>
                          {inv.invoiceNumber && <span className="text-xs text-[#8A8070]">#{inv.invoiceNumber}</span>}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                            {inv.status === 'paid' ? 'Paid' : overdue > 0 ? `${overdue}d overdue` : 'Current'}
                          </span>
                        </div>
                        <p className="text-xs text-[#8A8070]">
                          {inv.description || 'No description'} &middot; Due {new Date(inv.dueDate).toLocaleDateString()}
                          {inv.remindersCount > 0 && ` · ${inv.remindersCount} reminder${inv.remindersCount > 1 ? 's' : ''} sent`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold text-[#C17B2A]">${inv.amount.toFixed(2)}</span>
                        {inv.status === 'unpaid' && (
                          <button onClick={() => handleMarkPaid(inv.id)} className="text-xs bg-green-500/10 text-green-400 px-3 py-1.5 rounded-md hover:bg-green-500/20 transition-colors">
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ─── NEIGHBORHOOD PROOF POSTS ──────────────────────── */}
        <NeighborhoodProofSection clientName={clients.find((c) => c.id === selectedClientId)?.businessName || ''} />
      </div>
    </div>
  )
}

// ─── Neighborhood Proof Posts (collapsible) ─────────────────────────

function NeighborhoodProofSection({ clientName }: { clientName: string }) {
  const [open, setOpen] = useState(false)
  const [trade, setTrade] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [jobType, setJobType] = useState('')
  const [description, setDescription] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [generating, setGenerating] = useState(false)
  const [nextdoorPost, setNextdoorPost] = useState('')
  const [facebookPost, setFacebookPost] = useState('')
  const [copiedND, setCopiedND] = useState(false)
  const [copiedFB, setCopiedFB] = useState(false)

  const inputCls = 'w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] transition-colors placeholder:text-[#8A8070]/50'

  const canGenerate = (clientName || trade) && neighborhood && jobType && description

  const generate = async () => {
    setGenerating(true)
    setNextdoorPost('')
    setFacebookPost('')
    try {
      const res = await fetch('/api/max/neighborhood-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName || 'the business',
          trade: trade || 'contractor',
          neighborhood,
          jobType,
          description,
          customerName,
        }),
      })
      const data = await res.json()
      setNextdoorPost(data.nextdoorPost || '')
      setFacebookPost(data.facebookPost || '')
    } catch { /* ignore */ }
    setGenerating(false)
  }

  const copyND = () => { navigator.clipboard.writeText(nextdoorPost); setCopiedND(true); setTimeout(() => setCopiedND(false), 2000) }
  const copyFB = () => { navigator.clipboard.writeText(facebookPost); setCopiedFB(true); setTimeout(() => setCopiedFB(false), 2000) }

  return (
    <div className="mt-8 bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl overflow-hidden">
      {/* Collapsible header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[rgba(193,123,42,0.03)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">📣</span>
          <span className="text-sm font-medium text-[#F2EDE4]">Neighborhood Proof Posts — Nextdoor and Facebook</span>
        </div>
        <span className={`text-[#8A8070] text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {/* Collapsible content */}
      {open && (
        <div className="px-5 pb-5 border-t border-[rgba(193,123,42,0.1)]">
          <p className="text-xs text-[#8A8070] mt-4 mb-4">
            Generate hyperlocal social proof posts after completing a job. One for Nextdoor, one for Facebook groups.
          </p>

          {/* Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-[#8A8070] mb-1.5">Client Name</label>
              <input className={inputCls} value={clientName} readOnly={!!clientName} style={clientName ? { opacity: 0.6 } : {}} placeholder="Business name" />
            </div>
            <div>
              <label className="block text-xs text-[#8A8070] mb-1.5">Trade *</label>
              <input className={inputCls} value={trade} onChange={(e) => setTrade(e.target.value)} placeholder="e.g. plumber, roofer, general contractor" />
            </div>
            <div>
              <label className="block text-xs text-[#8A8070] mb-1.5">Neighborhood or Subdivision *</label>
              <input className={inputCls} value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="e.g. St. Matthews, Norton Commons" />
            </div>
            <div>
              <label className="block text-xs text-[#8A8070] mb-1.5">Job Type *</label>
              <input className={inputCls} value={jobType} onChange={(e) => setJobType(e.target.value)} placeholder="e.g. emergency pipe repair, full roof replacement" />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs text-[#8A8070] mb-1.5">One to two sentences describing what was done and the outcome *</label>
            <textarea className={inputCls + ' min-h-[80px]'} value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Replaced a burst pipe under the kitchen sink same day. No drywall damage, customer back to normal by dinner." />
          </div>

          <div className="mb-4">
            <label className="block text-xs text-[#8A8070] mb-1.5">Customer first name (optional — only if they gave permission to mention)</label>
            <input className={inputCls} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Sarah" />
          </div>

          <button onClick={generate} disabled={generating || !canGenerate} className="bg-[#C17B2A] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-50">
            {generating ? '📣 Generating...' : '📣 Generate Posts'}
          </button>

          {/* Results */}
          {(nextdoorPost || facebookPost) && (
            <div className="mt-6 space-y-6">
              {/* Nextdoor */}
              {nextdoorPost && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[#F2EDE4]">Nextdoor Post</span>
                    <button onClick={copyND} className="text-xs border border-[rgba(193,123,42,0.3)] text-[#C17B2A] px-3 py-1.5 rounded-lg hover:bg-[rgba(193,123,42,0.1)] transition-colors">
                      {copiedND ? '✓ Copied' : '📋 Copy'}
                    </button>
                  </div>
                  <textarea
                    className={inputCls + ' min-h-[150px] text-sm leading-relaxed'}
                    value={nextdoorPost}
                    onChange={(e) => setNextdoorPost(e.target.value)}
                  />
                  <p className="text-[10px] text-[#8A8070] mt-1">For Nextdoor — post in the neighborhood feed. Warm and neighborly tone.</p>
                </div>
              )}

              {/* Facebook */}
              {facebookPost && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[#F2EDE4]">Facebook Group Post</span>
                    <button onClick={copyFB} className="text-xs border border-[rgba(193,123,42,0.3)] text-[#C17B2A] px-3 py-1.5 rounded-lg hover:bg-[rgba(193,123,42,0.1)] transition-colors">
                      {copiedFB ? '✓ Copied' : '📋 Copy'}
                    </button>
                  </div>
                  <textarea
                    className={inputCls + ' min-h-[130px] text-sm leading-relaxed'}
                    value={facebookPost}
                    onChange={(e) => setFacebookPost(e.target.value)}
                  />
                  <p className="text-[10px] text-[#8A8070] mt-1">For Facebook neighborhood groups — check group rules before posting. Casual community tone.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
