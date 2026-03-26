'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface AgentClientBasic {
  id: string
  businessName: string
  irisEnabled: boolean
}

interface FollowUpData {
  id: string
  followUpNum: number
  channel: string
  subject: string | null
  message: string
  sentAt: string | null
  status: string
}

interface IrisLeadData {
  id: string
  clientId: string
  novaLeadId: string | null
  leadName: string
  leadEmail: string | null
  leadPhone: string | null
  source: string
  serviceNeeded: string | null
  initialMessage: string | null
  status: string
  followUpCount: number
  lastFollowUpAt: string | null
  nextFollowUpAt: string | null
  convertedAt: string | null
  createdAt: string
  followUps: FollowUpData[]
}

type Column = 'new' | 'following-up' | 'exhausted' | 'converted'

const COLUMNS: { key: Column; label: string; color: string }[] = [
  { key: 'new', label: 'New', color: 'text-orange-400' },
  { key: 'following-up', label: 'Following Up', color: 'text-blue-400' },
  { key: 'exhausted', label: 'Exhausted', color: 'text-gray-400' },
  { key: 'converted', label: 'Converted', color: 'text-green-400' },
]

export default function IrisDashboard() {
  const [clients, setClients] = useState<AgentClientBasic[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [leads, setLeads] = useState<IrisLeadData[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [toast, setToast] = useState('')
  const [expandedLead, setExpandedLead] = useState<string | null>(null)
  const [showAddLead, setShowAddLead] = useState(false)
  const [newLead, setNewLead] = useState({
    leadName: '', leadEmail: '', leadPhone: '', source: 'manual', serviceNeeded: '', initialMessage: '',
  })

  useEffect(() => {
    fetch('/api/agent-clients')
      .then((r) => r.json())
      .then((data) => {
        const irisClients = (data.clients || []).filter((c: AgentClientBasic) => c.irisEnabled)
        setClients(irisClients)
        if (irisClients.length > 0) setSelectedClientId(irisClients[0].id)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const fetchLeads = useCallback(() => {
    if (!selectedClientId) return
    fetch(`/api/iris/leads?clientId=${selectedClientId}`)
      .then((r) => r.json())
      .then((data) => setLeads(data.leads || []))
      .catch(() => {})
  }, [selectedClientId])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const handleRunIris = async () => {
    setProcessing(true)
    try {
      const res = await fetch('/api/iris/process', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        showToast(data.processed > 0 ? `${data.processed} follow-up${data.processed > 1 ? 's' : ''} sent!` : 'Nothing due yet.')
        fetchLeads()
      } else {
        showToast('Process failed.')
      }
    } catch { showToast('Process error.') }
    finally { setProcessing(false) }
  }

  const handleConvert = async (leadId: string, status: string) => {
    try {
      const res = await fetch('/api/iris/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, status }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(status === 'converted' ? 'Marked as converted!' : 'Marked as dead.')
        fetchLeads()
      }
    } catch { showToast('Update failed.') }
  }

  const handleAddLead = async () => {
    if (!selectedClientId || !newLead.leadName) return
    try {
      const res = await fetch('/api/iris/add-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newLead, clientId: selectedClientId }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('Lead added to Iris pipeline!')
        setNewLead({ leadName: '', leadEmail: '', leadPhone: '', source: 'manual', serviceNeeded: '', initialMessage: '' })
        setShowAddLead(false)
        fetchLeads()
      }
    } catch { showToast('Failed to add lead.') }
  }

  const daysSince = (date: string) => Math.floor((Date.now() - new Date(date).getTime()) / 86400000)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const newCount = leads.filter((l) => l.status === 'new').length
  const followingCount = leads.filter((l) => l.status === 'following-up').length
  const convertedThisMonth = leads.filter((l) => l.status === 'converted' && l.convertedAt && new Date(l.convertedAt) >= monthStart).length
  const exhaustedCount = leads.filter((l) => l.status === 'exhausted').length

  const inputCls = 'w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] transition-colors placeholder:text-[#8A8070]/50'

  if (loading) return <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center text-[#8A8070]">Loading...</div>

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Toast */}
        {toast && (
          <div className="fixed top-6 right-6 bg-[#1E1B16] border border-[#C17B2A]/30 text-[#F2EDE4] text-sm px-5 py-3 rounded-lg shadow-lg z-50">
            {toast}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <Link href="/" className="text-xs text-[#8A8070] hover:text-[#C17B2A] transition-colors">&larr; Dashboard</Link>
            <h1 className="text-2xl font-semibold text-[#F2EDE4] mt-1">Iris — Follow-Up Agent</h1>
            <p className="text-sm text-[#8A8070]">Automated follow-ups for leads that go cold</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowAddLead(!showAddLead)} className="border border-[rgba(193,123,42,0.3)] text-[#C17B2A] px-4 py-2 rounded-lg text-sm hover:bg-[rgba(193,123,42,0.1)] transition-colors">
              + Add Lead
            </button>
            <button onClick={handleRunIris} disabled={processing} className="bg-[#C17B2A] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-50">
              {processing ? 'Running...' : 'Run Iris Now'}
            </button>
          </div>
        </div>

        {/* Client Selector */}
        <div className="mb-6">
          <select
            className="bg-[#1E1B16] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] w-full md:w-72"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
          >
            {clients.length === 0 && <option value="">No Iris-enabled clients</option>}
            {clients.map((c) => <option key={c.id} value={c.id}>{c.businessName}</option>)}
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'New Leads', value: newCount, color: 'text-orange-400' },
            { label: 'Following Up', value: followingCount, color: 'text-blue-400' },
            { label: 'Converted This Month', value: convertedThisMonth, color: 'text-green-400' },
            { label: 'Exhausted', value: exhaustedCount, color: 'text-gray-400' },
          ].map((s) => (
            <div key={s.label} className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
              <div className={`text-2xl font-semibold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-[#8A8070] mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Add Lead Form */}
        {showAddLead && (
          <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-5 mb-6 space-y-4">
            <h3 className="text-sm font-medium text-[#F2EDE4]">Add Manual Lead</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-[#8A8070] mb-1.5">Lead Name *</label>
                <input className={inputCls} value={newLead.leadName} onChange={(e) => setNewLead((p) => ({ ...p, leadName: e.target.value }))} placeholder="Jane Doe" />
              </div>
              <div>
                <label className="block text-xs text-[#8A8070] mb-1.5">Email</label>
                <input className={inputCls} type="email" value={newLead.leadEmail} onChange={(e) => setNewLead((p) => ({ ...p, leadEmail: e.target.value }))} placeholder="jane@example.com" />
              </div>
              <div>
                <label className="block text-xs text-[#8A8070] mb-1.5">Phone</label>
                <input className={inputCls} type="tel" value={newLead.leadPhone} onChange={(e) => setNewLead((p) => ({ ...p, leadPhone: e.target.value }))} placeholder="(555) 123-4567" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#8A8070] mb-1.5">Source</label>
                <select className={inputCls} value={newLead.source} onChange={(e) => setNewLead((p) => ({ ...p, source: e.target.value }))}>
                  <option value="manual">Manual</option>
                  <option value="phone">Phone Call</option>
                  <option value="referral">Referral</option>
                  <option value="social">Social Media</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#8A8070] mb-1.5">Service Needed</label>
                <input className={inputCls} value={newLead.serviceNeeded} onChange={(e) => setNewLead((p) => ({ ...p, serviceNeeded: e.target.value }))} placeholder="Drain cleaning, HVAC repair..." />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#8A8070] mb-1.5">Initial Message / Notes</label>
              <textarea className={inputCls + ' min-h-[60px]'} value={newLead.initialMessage} onChange={(e) => setNewLead((p) => ({ ...p, initialMessage: e.target.value }))} placeholder="What did they say when they reached out?" />
            </div>
            <button onClick={handleAddLead} disabled={!newLead.leadName} className="bg-[#C17B2A] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-40">
              Add to Pipeline
            </button>
          </div>
        )}

        {/* Kanban Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const colLeads = leads.filter((l) => l.status === col.key || (col.key === 'exhausted' && l.status === 'dead'))
            return (
              <div key={col.key}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className={`text-sm font-medium ${col.color}`}>{col.label}</h3>
                  <span className="text-xs text-[#8A8070] bg-[#1E1B16] px-2 py-0.5 rounded-full">{colLeads.length}</span>
                </div>
                <div className="space-y-3">
                  {colLeads.length === 0 ? (
                    <div className="text-xs text-[#8A8070]/50 text-center py-8 border border-dashed border-[rgba(193,123,42,0.1)] rounded-xl">None</div>
                  ) : colLeads.map((lead) => (
                    <div key={lead.id} className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-[#F2EDE4]">{lead.leadName}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${lead.source === 'nova' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
                            {lead.source === 'nova' ? 'Nova' : lead.source}
                          </span>
                        </div>
                      </div>

                      {lead.serviceNeeded && <p className="text-xs text-[#8A8070] mb-2">{lead.serviceNeeded}</p>}

                      <div className="flex items-center gap-3 text-[10px] text-[#8A8070] mb-3">
                        <span>{daysSince(lead.createdAt)}d ago</span>
                        <span className="bg-[#0E0C0A] px-1.5 py-0.5 rounded">{lead.followUpCount}/3 sent</span>
                        {lead.nextFollowUpAt && (
                          <span>Next: {new Date(lead.nextFollowUpAt).toLocaleDateString()}</span>
                        )}
                      </div>

                      {/* Last message preview */}
                      {lead.followUps.length > 0 && (
                        <p className="text-[11px] text-[#8A8070] mb-3 line-clamp-2 italic">
                          &ldquo;{lead.followUps[lead.followUps.length - 1].message.slice(0, 100)}...&rdquo;
                        </p>
                      )}

                      {/* Actions */}
                      {(lead.status === 'new' || lead.status === 'following-up' || lead.status === 'exhausted') && (
                        <div className="flex gap-2">
                          <button onClick={() => handleConvert(lead.id, 'converted')} className="flex-1 text-[10px] bg-green-500/10 text-green-400 px-2 py-1.5 rounded-md hover:bg-green-500/20 transition-colors">
                            Converted
                          </button>
                          <button onClick={() => handleConvert(lead.id, 'dead')} className="flex-1 text-[10px] bg-gray-500/10 text-gray-400 px-2 py-1.5 rounded-md hover:bg-gray-500/20 transition-colors">
                            Dead
                          </button>
                        </div>
                      )}

                      {/* Expand history */}
                      {lead.followUps.length > 0 && (
                        <button
                          onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)}
                          className="text-[10px] text-[#C17B2A] mt-2 hover:text-[#D4892F] transition-colors"
                        >
                          {expandedLead === lead.id ? 'Hide history' : `View ${lead.followUps.length} follow-up${lead.followUps.length > 1 ? 's' : ''}`}
                        </button>
                      )}

                      {expandedLead === lead.id && (
                        <div className="mt-3 space-y-2 border-t border-[rgba(193,123,42,0.1)] pt-3">
                          {lead.followUps.map((fu) => (
                            <div key={fu.id} className="bg-[#0E0C0A] rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-medium text-[#C17B2A]">#{fu.followUpNum}</span>
                                <span className="text-[10px] text-[#8A8070]">{fu.channel}</span>
                                {fu.sentAt && <span className="text-[10px] text-[#8A8070]">{new Date(fu.sentAt).toLocaleDateString()}</span>}
                              </div>
                              {fu.subject && <p className="text-[11px] text-[#F2EDE4] font-medium mb-1">{fu.subject}</p>}
                              <p className="text-[11px] text-[#8A8070] whitespace-pre-line">{fu.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* ─── ESTIMATE REACTIVATION ──────────────────────────── */}
        <EstimateReactivation
          clientId={selectedClientId}
          clientName={clients.find((c) => c.id === selectedClientId)?.businessName || ''}
          showToast={showToast}
        />
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ESTIMATE REACTIVATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ReactivationEntry {
  id: string
  prospectName: string
  jobType: string
  quoteAmount: string | null
  quotedAt: string | null
  reactivatedAt: string
  contactMethod: string
  outcome: string
  notes: string | null
}

const OUTCOMES = [
  { value: 'no_response', label: 'No response yet' },
  { value: 'interested', label: 'Responded — still interested' },
  { value: 'hired_other', label: 'Responded — hired someone else' },
  { value: 'not_doing', label: 'Responded — not doing the project' },
  { value: 'booked', label: 'Booked' },
]

const OUTCOME_COLORS: Record<string, string> = {
  no_response: 'text-[#8A8070] bg-[#0E0C0A]',
  interested: 'text-blue-400 bg-blue-500/20',
  hired_other: 'text-red-400 bg-red-500/20',
  not_doing: 'text-gray-400 bg-gray-500/20',
  booked: 'text-green-400 bg-green-500/20',
}

const TIME_AGO_OPTIONS = ['30 days ago', '60 days ago', '90 days ago', 'More than 90 days ago']
const CONTACT_METHODS = ['Text Message', 'Email', 'Facebook Message']

function EstimateReactivation({ clientId, clientName, showToast }: { clientId: string; clientName: string; showToast: (msg: string) => void }) {
  // Generator state
  const [trade, setTrade] = useState('')
  const [prospectName, setProspectName] = useState('')
  const [jobType, setJobType] = useState('')
  const [amount, setAmount] = useState('')
  const [timeAgo, setTimeAgo] = useState(TIME_AGO_OPTIONS[0])
  const [reason, setReason] = useState('')
  const [contactMethod, setContactMethod] = useState(CONTACT_METHODS[0])
  const [generating, setGenerating] = useState(false)
  const [generatedMsg, setGeneratedMsg] = useState('')

  // Log state
  const [entries, setEntries] = useState<ReactivationEntry[]>([])
  const [logLoading, setLogLoading] = useState(true)
  const [showAddEntry, setShowAddEntry] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editOutcome, setEditOutcome] = useState('')
  const [editNotes, setEditNotes] = useState('')

  // New entry form
  const [ne, setNe] = useState({ prospectName: '', jobType: '', quoteAmount: '', quotedAt: '', contactMethod: 'Text Message', outcome: 'no_response', notes: '' })

  const inputCls = 'w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] transition-colors placeholder:text-[#8A8070]/50'

  const loadLog = useCallback(() => {
    if (!clientId) return
    setLogLoading(true)
    fetch(`/api/iris/reactivation?clientId=${clientId}`)
      .then((r) => r.json())
      .then((data) => setEntries(data.entries || []))
      .catch(() => {})
      .finally(() => setLogLoading(false))
  }, [clientId])

  useEffect(() => { loadLog() }, [loadLog])

  // Generator
  const generate = async () => {
    if (!prospectName || !jobType || !trade) return
    setGenerating(true)
    setGeneratedMsg('')
    try {
      const res = await fetch('/api/iris/reactivation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', clientName: clientName || 'the business', trade, prospectName, jobType, amount, timeAgo, reason, contactMethod }),
      })
      const data = await res.json()
      setGeneratedMsg(data.message || '')
      if (data.message) showToast('Message generated!')
    } catch { showToast('Generation failed.') }
    setGenerating(false)
  }

  // Log CRUD
  const saveEntry = async () => {
    if (!ne.prospectName || !ne.jobType) return
    await fetch('/api/iris/reactivation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', clientId, ...ne }),
    })
    setNe({ prospectName: '', jobType: '', quoteAmount: '', quotedAt: '', contactMethod: 'Text Message', outcome: 'no_response', notes: '' })
    setShowAddEntry(false)
    showToast('Entry saved!')
    loadLog()
  }

  const updateOutcome = async () => {
    if (!editingId) return
    await fetch('/api/iris/reactivation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_outcome', id: editingId, outcome: editOutcome, notes: editNotes }),
    })
    setEditingId(null)
    showToast('Outcome updated!')
    loadLog()
  }

  // Stats
  const total = entries.length
  const booked = entries.filter((e) => e.outcome === 'booked').length
  const responded = entries.filter((e) => e.outcome !== 'no_response').length
  const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'

  return (
    <div className="mt-8 bg-[#1E1B16] rounded-2xl border border-[rgba(193,123,42,0.15)] overflow-hidden border-l-[3px] border-l-[#C17B2A]">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm">🔄</span>
          <h2 className="text-base font-medium text-[#F2EDE4]">Estimate Reactivation</h2>
        </div>
        <p className="text-xs text-[#8A8070] mb-6">Follow up on quotes that went quiet 30, 60, or 90 days ago.</p>

        {/* ─── PART 1: MESSAGE GENERATOR ──────────────────────── */}
        <div className="bg-[#0E0C0A] rounded-xl p-5 border border-[rgba(193,123,42,0.1)] mb-6">
          <h3 className="text-xs font-medium text-[#C17B2A] uppercase tracking-wider mb-4">Reactivation Message Generator</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs text-[#8A8070] mb-1">Client Name</label>
              <input className={inputCls} value={clientName} readOnly={!!clientName} style={clientName ? { opacity: 0.6 } : {}} />
            </div>
            <div>
              <label className="block text-xs text-[#8A8070] mb-1">Trade *</label>
              <input className={inputCls} value={trade} onChange={(e) => setTrade(e.target.value)} placeholder="e.g. plumber, roofer" />
            </div>
            <div>
              <label className="block text-xs text-[#8A8070] mb-1">Prospect First Name *</label>
              <input className={inputCls} value={prospectName} onChange={(e) => setProspectName(e.target.value)} placeholder="e.g. Sarah" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs text-[#8A8070] mb-1">Job Type Quoted *</label>
              <input className={inputCls} value={jobType} onChange={(e) => setJobType(e.target.value)} placeholder="e.g. roof replacement" />
            </div>
            <div>
              <label className="block text-xs text-[#8A8070] mb-1">Quote Amount (optional)</label>
              <input className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. $4,500" />
            </div>
            <div>
              <label className="block text-xs text-[#8A8070] mb-1">How Long Ago</label>
              <select className={inputCls} value={timeAgo} onChange={(e) => setTimeAgo(e.target.value)}>
                {TIME_AGO_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs text-[#8A8070] mb-1">Known Reason They Went Quiet (optional)</label>
              <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. getting other quotes, budget concerns" />
            </div>
            <div>
              <label className="block text-xs text-[#8A8070] mb-1">Contact Method</label>
              <select className={inputCls} value={contactMethod} onChange={(e) => setContactMethod(e.target.value)}>
                {CONTACT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <button onClick={generate} disabled={generating || !prospectName || !jobType || !trade}
            className="bg-[#C17B2A] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-50">
            {generating ? '🔄 Generating...' : '🔄 Generate Message'}
          </button>

          {generatedMsg && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#8A8070]">Generated message — personalize before sending</span>
                <button onClick={() => { navigator.clipboard.writeText(generatedMsg); showToast('Copied!') }}
                  className="text-xs border border-[rgba(193,123,42,0.3)] text-[#C17B2A] px-3 py-1.5 rounded-lg hover:bg-[rgba(193,123,42,0.1)] transition-colors">
                  📋 Copy
                </button>
              </div>
              <textarea className={inputCls + ' min-h-[120px] text-sm leading-relaxed'} value={generatedMsg} onChange={(e) => setGeneratedMsg(e.target.value)} />
              <p className="text-[10px] text-[#8A8070] mt-2 italic">
                Personalize before sending. Replace any bracketed placeholders. If 90 or more days have passed consider offering a fresh quote rather than referencing the old number.
              </p>
            </div>
          )}
        </div>

        {/* ─── PART 2: REACTIVATION LOG ──────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-medium text-[#C17B2A] uppercase tracking-wider">Reactivation Log</h3>
            <button onClick={() => setShowAddEntry(!showAddEntry)} className="text-xs text-[#C17B2A] hover:text-[#D4892F] transition-colors">
              {showAddEntry ? '— Hide' : '+ New Entry'}
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-[#0E0C0A] rounded-lg p-3 border border-[rgba(193,123,42,0.1)]">
              <div className="text-lg font-semibold text-[#C17B2A]">{total}</div>
              <div className="text-[10px] text-[#8A8070]">Total Reactivated</div>
            </div>
            <div className="bg-[#0E0C0A] rounded-lg p-3 border border-[rgba(193,123,42,0.1)]">
              <div className="text-lg font-semibold text-green-400">{booked}</div>
              <div className="text-[10px] text-[#8A8070]">Booked</div>
            </div>
            <div className="bg-[#0E0C0A] rounded-lg p-3 border border-[rgba(193,123,42,0.1)]">
              <div className="text-lg font-semibold text-blue-400">{responseRate}%</div>
              <div className="text-[10px] text-[#8A8070]">Response Rate</div>
            </div>
          </div>

          {/* Add entry form */}
          {showAddEntry && (
            <div className="bg-[#0E0C0A] rounded-lg p-4 border border-[rgba(193,123,42,0.15)] mb-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Prospect Name *</label>
                  <input className={inputCls} value={ne.prospectName} onChange={(e) => setNe((p) => ({ ...p, prospectName: e.target.value }))} placeholder="Jane Doe" />
                </div>
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Job Type *</label>
                  <input className={inputCls} value={ne.jobType} onChange={(e) => setNe((p) => ({ ...p, jobType: e.target.value }))} placeholder="Roof replacement" />
                </div>
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Quote Amount</label>
                  <input className={inputCls} value={ne.quoteAmount} onChange={(e) => setNe((p) => ({ ...p, quoteAmount: e.target.value }))} placeholder="$4,500" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Date Quoted</label>
                  <input className={inputCls} type="date" value={ne.quotedAt} onChange={(e) => setNe((p) => ({ ...p, quotedAt: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Contact Method</label>
                  <select className={inputCls} value={ne.contactMethod} onChange={(e) => setNe((p) => ({ ...p, contactMethod: e.target.value }))}>
                    {CONTACT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Outcome</label>
                  <select className={inputCls} value={ne.outcome} onChange={(e) => setNe((p) => ({ ...p, outcome: e.target.value }))}>
                    {OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#8A8070] mb-1">Notes</label>
                <input className={inputCls} value={ne.notes} onChange={(e) => setNe((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional notes..." />
              </div>
              <button onClick={saveEntry} disabled={!ne.prospectName || !ne.jobType}
                className="bg-[#C17B2A] text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-50">
                Save Entry
              </button>
            </div>
          )}

          {/* Log table */}
          {logLoading ? (
            <p className="text-xs text-[#8A8070] py-4">Loading log...</p>
          ) : entries.length === 0 ? (
            <p className="text-xs text-[#8A8070] py-4">No reactivation entries yet. Add one after following up on a quiet estimate.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#8A8070] border-b border-[rgba(193,123,42,0.1)]">
                    <th className="text-left py-2 pr-3 font-medium">Prospect</th>
                    <th className="text-left py-2 pr-3 font-medium">Job</th>
                    <th className="text-left py-2 pr-3 font-medium">Quoted</th>
                    <th className="text-left py-2 pr-3 font-medium">Reactivated</th>
                    <th className="text-left py-2 pr-3 font-medium">Method</th>
                    <th className="text-left py-2 pr-3 font-medium">Outcome</th>
                    <th className="text-right py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-[rgba(193,123,42,0.05)] hover:bg-[rgba(193,123,42,0.02)]">
                      <td className="py-2.5 pr-3 text-[#F2EDE4]">{entry.prospectName}</td>
                      <td className="py-2.5 pr-3 text-[#8A8070]">{entry.jobType}</td>
                      <td className="py-2.5 pr-3 text-[#8A8070]">{fmtDate(entry.quotedAt)}</td>
                      <td className="py-2.5 pr-3 text-[#8A8070]">{fmtDate(entry.reactivatedAt)}</td>
                      <td className="py-2.5 pr-3 text-[#8A8070]">{entry.contactMethod}</td>
                      <td className="py-2.5 pr-3">
                        {editingId === entry.id ? (
                          <div className="flex items-center gap-2">
                            <select className="bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded px-2 py-1 text-[#F2EDE4] text-[11px]"
                              value={editOutcome} onChange={(e) => setEditOutcome(e.target.value)}>
                              {OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            <input className="bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded px-2 py-1 text-[#F2EDE4] text-[11px] w-24"
                              value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Notes..." />
                            <button onClick={updateOutcome} className="text-[10px] text-green-400 hover:text-green-300">Save</button>
                            <button onClick={() => setEditingId(null)} className="text-[10px] text-[#8A8070]">Cancel</button>
                          </div>
                        ) : (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${OUTCOME_COLORS[entry.outcome] || OUTCOME_COLORS.no_response}`}>
                            {OUTCOMES.find((o) => o.value === entry.outcome)?.label || entry.outcome}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-right">
                        {editingId !== entry.id && (
                          <button onClick={() => { setEditingId(entry.id); setEditOutcome(entry.outcome); setEditNotes(entry.notes || '') }}
                            className="text-[10px] text-[#C17B2A] hover:text-[#D4892F]">Edit</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tip card */}
          <div className="bg-[#0E0C0A] rounded-lg p-3 border border-[rgba(193,123,42,0.1)] mt-4">
            <p className="text-[11px] text-[#8A8070] leading-relaxed">
              The best time to reactivate a quiet estimate is 30 days out. Most prospects who ghost are not saying no — they are saying not yet. A single warm check-in at 30 days recovers significantly more jobs than waiting until 90 days when they have likely moved on.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
