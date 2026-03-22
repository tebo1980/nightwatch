'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

// ─── Types ──────────────────────────────────────────────────────

interface BoltConfig {
  id: string
  clientId: string
  clientSlug: string
  businessName: string
  businessPhone: string
  businessEmail: string
  businessAddress: string | null
  logoUrl: string | null
  licenseNumber: string | null
  insuranceInfo: string | null
  trade: string
  laborRatePerHour: number
  minimumJobSize: number
  taxRate: number
  paymentTerms: string
  warrantyTerms: string
  validityDays: number
  escalationClause: boolean
  estimateCount: number
}

interface Estimate {
  id: string
  clientId: string
  estimateNumber: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  customerAddress: string
  jobType: string
  jobDescription: string
  lineItems: { name: string; unit: string; unitPrice: number; quantity: number; total: number }[]
  laborHours: number
  laborRate: number
  laborTotal: number
  materialsTotal: number
  subtotal: number
  taxAmount: number
  totalAmount: number
  depositRequired: number
  validUntil: string
  status: string
  sentAt: string | null
  approvedAt: string | null
  notes: string | null
  pdfUrl: string | null
  createdAt: string
}

interface AgentClient {
  id: string
  businessName: string
  ownerName: string
  industry: string
  contactPhone: string | null
  ownerEmail: string
  city: string
  state: string
}

const TRADES = [
  'Plumber', 'HVAC', 'Electrician', 'General Contractor', 'Painter',
  'Roofer', 'Landscaper', 'Handyman', 'Deck Builder', 'Concrete',
]

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getEffectiveStatus(est: Estimate): string {
  if (est.status === 'sent' && new Date(est.validUntil) < new Date()) return 'expired'
  return est.status
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500/20 text-gray-400',
  sent: 'bg-blue-500/20 text-blue-400',
  approved: 'bg-green-500/20 text-green-400',
  'changes-requested': 'bg-[#C17B2A]/20 text-[#C17B2A]',
  expired: 'bg-red-500/20 text-red-400',
}

// ─── Component ──────────────────────────────────────────────────

export default function BoltAdmin() {
  const [configs, setConfigs] = useState<BoltConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [agentClients, setAgentClients] = useState<AgentClient[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Estimates
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [estimatesLoading, setEstimatesLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null)
  const [expiryNotice, setExpiryNotice] = useState('')

  // Form state
  const [form, setForm] = useState({
    clientId: '', clientSlug: '', businessName: '', businessPhone: '',
    businessEmail: '', businessAddress: '', logoUrl: '', licenseNumber: '',
    insuranceInfo: '', trade: 'Plumber', laborRatePerHour: 75, minimumJobSize: 150,
    taxRate: 0, paymentTerms: '50% deposit required to schedule. Balance due upon completion.',
    warrantyTerms: 'All work warranted for 1 year from completion date.',
    validityDays: 14, escalationClause: true,
  })

  useEffect(() => { loadConfigs() }, [])

  function loadConfigs() {
    setLoading(true)
    fetch('/api/bolt/config')
      .then((r) => r.json())
      .then((data) => setConfigs(data.configs || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const loadEstimates = useCallback((clientId: string) => {
    setEstimatesLoading(true)
    setSelectedEstimate(null)
    fetch(`/api/bolt/estimates?clientId=${clientId}`)
      .then((r) => r.json())
      .then((data) => {
        const ests: Estimate[] = data.estimates || []
        setEstimates(ests)
        // Auto-expiry: mark expired estimates
        const now = new Date()
        const toExpire = ests.filter((e) => e.status === 'sent' && new Date(e.validUntil) < now)
        if (toExpire.length > 0) {
          Promise.all(toExpire.map((e) =>
            fetch(`/api/bolt/estimates/${e.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'expired' }),
            })
          )).then(() => {
            setExpiryNotice(`${toExpire.length} estimate${toExpire.length > 1 ? 's' : ''} marked as expired.`)
            setTimeout(() => setExpiryNotice(''), 5000)
            // Reload
            fetch(`/api/bolt/estimates?clientId=${clientId}`)
              .then((r) => r.json())
              .then((data) => setEstimates(data.estimates || []))
          })
        }
      })
      .catch(() => {})
      .finally(() => setEstimatesLoading(false))
  }, [])

  function handleClientChange(clientId: string) {
    setSelectedClientId(clientId)
    if (clientId) loadEstimates(clientId)
    else { setEstimates([]); setSelectedEstimate(null) }
  }

  // ─── Monthly stats ─────────────────────────────────────────────

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const sentThisMonth = estimates.filter((e) => e.sentAt && new Date(e.sentAt) >= monthStart).length
  const approvedThisMonth = estimates.filter((e) => e.approvedAt && new Date(e.approvedAt) >= monthStart).length
  const sentOrApproved = estimates.filter((e) => e.status === 'sent' || e.status === 'approved')
  const totalValueSent = sentOrApproved.reduce((s, e) => s + e.totalAmount, 0)
  const approvalRate = sentThisMonth > 0 ? Math.round((approvedThisMonth / sentThisMonth) * 100) : 0
  const rateColor = approvalRate > 50 ? 'text-green-400' : approvalRate >= 25 ? 'text-yellow-400' : 'text-red-400'

  // ─── Filtered estimates ────────────────────────────────────────

  const filteredEstimates = estimates.filter((e) => {
    const status = getEffectiveStatus(e)
    if (statusFilter !== 'all' && status !== statusFilter) return false
    if (searchQuery && !e.customerName.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // ─── Add client form ──────────────────────────────────────────

  function openForm() {
    setShowForm(true); setError('')
    fetch('/api/agent-clients').then((r) => r.json()).then((data) => setAgentClients(data.clients || []))
  }

  function handleClientSelect(clientId: string) {
    const client = agentClients.find((c) => c.id === clientId)
    if (client) {
      setForm((f) => ({ ...f, clientId, businessName: client.businessName, businessPhone: client.contactPhone || '', businessEmail: client.ownerEmail || '', clientSlug: slugify(client.businessName) }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const res = await fetch('/api/bolt/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save'); return }
      setShowForm(false)
      setForm({ clientId: '', clientSlug: '', businessName: '', businessPhone: '', businessEmail: '', businessAddress: '', logoUrl: '', licenseNumber: '', insuranceInfo: '', trade: 'Plumber', laborRatePerHour: 75, minimumJobSize: 150, taxRate: 0, paymentTerms: '50% deposit required to schedule. Balance due upon completion.', warrantyTerms: 'All work warranted for 1 year from completion date.', validityDays: 14, escalationClause: true })
      loadConfigs()
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  // ─── Detail panel actions ──────────────────────────────────────

  async function updateEstimateStatus(id: string, status: string) {
    await fetch(`/api/bolt/estimates/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    if (selectedClientId) loadEstimates(selectedClientId)
    setSelectedEstimate(null)
  }

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="text-[#8A8070] hover:text-[#C17B2A] transition-colors text-sm">&larr; Dashboard</Link>
            <h1 className="text-2xl font-semibold text-[#C17B2A] mt-2">&#9889; Bolt</h1>
            <p className="text-sm text-[#8A8070]">On-Site Estimate Builder</p>
          </div>
          <button onClick={openForm} className="bg-[#C17B2A] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors flex items-center gap-2">
            <span className="text-lg leading-none">+</span> Add Client to Bolt
          </button>
        </div>

        {/* Expiry notice */}
        {expiryNotice && (
          <div className="bg-red-500/10 text-red-400 text-sm px-4 py-2 rounded-lg mb-4">{expiryNotice}</div>
        )}

        {/* Summary bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
            <div className="text-2xl font-semibold text-[#C17B2A]">{sentThisMonth}</div>
            <div className="text-xs text-[#8A8070] mt-1">Sent This Month</div>
          </div>
          <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
            <div className="text-2xl font-semibold text-[#C17B2A]">${fmt(totalValueSent)}</div>
            <div className="text-xs text-[#8A8070] mt-1">Total Value Sent</div>
          </div>
          <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
            <div className="text-2xl font-semibold text-[#C17B2A]">{approvedThisMonth}</div>
            <div className="text-xs text-[#8A8070] mt-1">Approved This Month</div>
          </div>
          <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
            <div className={`text-2xl font-semibold ${selectedClientId ? rateColor : 'text-[#8A8070]'}`}>{selectedClientId ? `${approvalRate}%` : '—'}</div>
            <div className="text-xs text-[#8A8070] mt-1">Approval Rate</div>
          </div>
        </div>

        {/* Client selector */}
        <div className="mb-6">
          <label className="block text-xs text-[#8A8070] mb-1.5">Select Client</label>
          <select
            value={selectedClientId}
            onChange={(e) => handleClientChange(e.target.value)}
            className="w-full md:w-80 bg-[#1E1B16] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2.5 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]"
          >
            <option value="">Choose a client...</option>
            {configs.map((c) => (
              <option key={c.clientId} value={c.clientId}>{c.businessName} — {c.trade}</option>
            ))}
          </select>
        </div>

        {/* Client list when no client selected */}
        {loading ? (
          <div className="text-center text-[#8A8070] py-20">Loading...</div>
        ) : !selectedClientId ? (
          configs.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[#8A8070] mb-4">No clients configured for Bolt yet</p>
              <button onClick={openForm} className="bg-[#C17B2A] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors">Add Your First Client</button>
            </div>
          ) : (
            <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(193,123,42,0.15)]">
                    <th className="text-left text-[#8A8070] font-medium px-4 py-3">Business</th>
                    <th className="text-left text-[#8A8070] font-medium px-4 py-3">Slug URL</th>
                    <th className="text-left text-[#8A8070] font-medium px-4 py-3">Trade</th>
                    <th className="text-center text-[#8A8070] font-medium px-4 py-3">Estimates</th>
                    <th className="text-right text-[#8A8070] font-medium px-4 py-3">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {configs.map((config) => (
                    <tr key={config.id} className="border-b border-[rgba(193,123,42,0.08)] hover:bg-[rgba(193,123,42,0.05)] cursor-pointer" onClick={() => handleClientChange(config.clientId)}>
                      <td className="px-4 py-3 text-[#F2EDE4] font-medium">{config.businessName}</td>
                      <td className="px-4 py-3"><a href={`/bolt/${config.clientSlug}`} target="_blank" rel="noopener noreferrer" className="text-[#C17B2A] hover:underline text-xs font-mono" onClick={(e) => e.stopPropagation()}>/bolt/{config.clientSlug}</a></td>
                      <td className="px-4 py-3 text-[#8A8070]">{config.trade}</td>
                      <td className="px-4 py-3 text-center text-[#F2EDE4]">{config.estimateCount}</td>
                      <td className="px-4 py-3 text-right text-[#8A8070]">${config.laborRatePerHour}/hr</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* ─── Estimates view for selected client ─────────────── */
          <div className="flex gap-6">
            <div className={`${selectedEstimate ? 'flex-1' : 'w-full'} transition-all`}>
              {/* Filter bar */}
              <div className="flex flex-wrap gap-3 mb-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#1E1B16] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="approved">Approved</option>
                  <option value="changes-requested">Changes Requested</option>
                  <option value="expired">Expired</option>
                </select>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customer name..."
                  className="flex-1 min-w-[200px] bg-[#1E1B16] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] placeholder-[#555] focus:outline-none focus:border-[#C17B2A]"
                />
              </div>

              {/* Estimates table */}
              {estimatesLoading ? (
                <p className="text-[#8A8070] text-sm py-8 text-center">Loading estimates...</p>
              ) : filteredEstimates.length === 0 ? (
                <p className="text-[#8A8070] text-sm py-8 text-center">{estimates.length === 0 ? 'No estimates yet' : 'No estimates match filters'}</p>
              ) : (
                <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[rgba(193,123,42,0.15)]">
                        <th className="text-left text-[#8A8070] font-medium px-3 py-2.5">Estimate #</th>
                        <th className="text-left text-[#8A8070] font-medium px-3 py-2.5">Customer</th>
                        <th className="text-left text-[#8A8070] font-medium px-3 py-2.5 hidden md:table-cell">Job Type</th>
                        <th className="text-right text-[#8A8070] font-medium px-3 py-2.5">Amount</th>
                        <th className="text-center text-[#8A8070] font-medium px-3 py-2.5">Status</th>
                        <th className="text-right text-[#8A8070] font-medium px-3 py-2.5 hidden md:table-cell">Sent</th>
                        <th className="text-right text-[#8A8070] font-medium px-3 py-2.5 hidden lg:table-cell">Approved</th>
                        <th className="text-right text-[#8A8070] font-medium px-3 py-2.5">PDF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEstimates.map((est) => {
                        const status = getEffectiveStatus(est)
                        return (
                          <tr
                            key={est.id}
                            onClick={() => setSelectedEstimate(est)}
                            className={`border-b border-[rgba(193,123,42,0.08)] cursor-pointer transition-colors ${selectedEstimate?.id === est.id ? 'bg-[rgba(193,123,42,0.1)]' : 'hover:bg-[rgba(193,123,42,0.05)]'}`}
                          >
                            <td className="px-3 py-2.5 text-[#C17B2A] font-mono text-xs">{est.estimateNumber}</td>
                            <td className="px-3 py-2.5 text-[#F2EDE4]">{est.customerName}</td>
                            <td className="px-3 py-2.5 text-[#8A8070] hidden md:table-cell">{est.jobType}</td>
                            <td className="px-3 py-2.5 text-right text-[#F2EDE4] font-medium">${fmt(est.totalAmount)}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status] || STATUS_COLORS.draft}`}>{status}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right text-[#8A8070] text-xs hidden md:table-cell">{est.sentAt ? new Date(est.sentAt).toLocaleDateString() : '—'}</td>
                            <td className="px-3 py-2.5 text-right text-[#8A8070] text-xs hidden lg:table-cell">{est.approvedAt ? new Date(est.approvedAt).toLocaleDateString() : '—'}</td>
                            <td className="px-3 py-2.5 text-right">
                              {est.pdfUrl && <a href={est.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-[#C17B2A] hover:underline text-xs" onClick={(e) => e.stopPropagation()}>View</a>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ─── Detail panel ──────────────────────────────────── */}
            {selectedEstimate && (
              <div className="w-96 shrink-0 bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-5 self-start sticky top-6 hidden lg:block">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-[#C17B2A]">#{selectedEstimate.estimateNumber}</h3>
                  <button onClick={() => setSelectedEstimate(null)} className="text-[#8A8070] hover:text-[#F2EDE4]">&times;</button>
                </div>

                {/* Status */}
                <div className="mb-4">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[getEffectiveStatus(selectedEstimate)] || STATUS_COLORS.draft}`}>
                    {getEffectiveStatus(selectedEstimate)}
                  </span>
                </div>

                {/* Customer */}
                <div className="mb-4">
                  <div className="text-[10px] text-[#8A8070] uppercase tracking-wide mb-1">Customer</div>
                  <div className="text-sm text-[#F2EDE4] font-medium">{selectedEstimate.customerName}</div>
                  <div className="text-xs text-[#8A8070]">{selectedEstimate.customerPhone}</div>
                  {selectedEstimate.customerEmail && <div className="text-xs text-[#8A8070]">{selectedEstimate.customerEmail}</div>}
                  <div className="text-xs text-[#8A8070]">{selectedEstimate.customerAddress}</div>
                </div>

                {/* Job */}
                <div className="mb-4">
                  <div className="text-[10px] text-[#8A8070] uppercase tracking-wide mb-1">Job</div>
                  <div className="text-sm text-[#F2EDE4] font-medium">{selectedEstimate.jobType}</div>
                  <div className="text-xs text-[#8A8070] mt-0.5">{selectedEstimate.jobDescription}</div>
                </div>

                {/* Financials */}
                <div className="mb-4 space-y-1">
                  <div className="text-[10px] text-[#8A8070] uppercase tracking-wide mb-1">Cost</div>
                  <div className="flex justify-between text-xs"><span className="text-[#8A8070]">Labor</span><span className="text-[#F2EDE4]">${fmt(selectedEstimate.laborTotal)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-[#8A8070]">Materials</span><span className="text-[#F2EDE4]">${fmt(selectedEstimate.materialsTotal)}</span></div>
                  {selectedEstimate.taxAmount > 0 && <div className="flex justify-between text-xs"><span className="text-[#8A8070]">Tax</span><span className="text-[#F2EDE4]">${fmt(selectedEstimate.taxAmount)}</span></div>}
                  <div className="flex justify-between text-sm font-semibold pt-1 border-t border-[rgba(193,123,42,0.1)]"><span className="text-[#F2EDE4]">Total</span><span className="text-[#C17B2A]">${fmt(selectedEstimate.totalAmount)}</span></div>
                </div>

                {/* Timestamps */}
                <div className="mb-4 space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-[#8A8070]">Created</span><span className="text-[#F2EDE4]">{new Date(selectedEstimate.createdAt).toLocaleDateString()}</span></div>
                  {selectedEstimate.sentAt && <div className="flex justify-between"><span className="text-[#8A8070]">Sent</span><span className="text-[#F2EDE4]">{new Date(selectedEstimate.sentAt).toLocaleDateString()}</span></div>}
                  {selectedEstimate.approvedAt && <div className="flex justify-between"><span className="text-[#8A8070]">Approved</span><span className="text-green-400">{new Date(selectedEstimate.approvedAt).toLocaleDateString()}</span></div>}
                  <div className="flex justify-between"><span className="text-[#8A8070]">Valid Until</span><span className="text-[#F2EDE4]">{new Date(selectedEstimate.validUntil).toLocaleDateString()}</span></div>
                </div>

                {/* PDF link */}
                {selectedEstimate.pdfUrl && (
                  <a href={selectedEstimate.pdfUrl} target="_blank" rel="noopener noreferrer" className="block text-center text-sm text-[#C17B2A] hover:underline mb-4">View PDF &rarr;</a>
                )}

                {/* Action buttons based on status */}
                <div className="space-y-2 pt-2 border-t border-[rgba(193,123,42,0.1)]">
                  {getEffectiveStatus(selectedEstimate) === 'draft' && (
                    <button onClick={() => updateEstimateStatus(selectedEstimate.id, 'sent')} className="w-full bg-[#C17B2A] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#D4892F]">Send Now</button>
                  )}
                  {getEffectiveStatus(selectedEstimate) === 'changes-requested' && (
                    <button onClick={() => updateEstimateStatus(selectedEstimate.id, 'draft')} className="w-full bg-[#C17B2A] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#D4892F]">Mark as Revised</button>
                  )}
                  {getEffectiveStatus(selectedEstimate) === 'expired' && (
                    <button onClick={() => updateEstimateStatus(selectedEstimate.id, 'expired')} className="w-full bg-red-500/20 text-red-400 py-2 rounded-lg text-sm font-medium" disabled>Expired</button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Add Client Form Modal ────────────────────────── */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-10 z-50 overflow-y-auto">
            <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.3)] p-6 w-full max-w-2xl mx-4 mb-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-[#F2EDE4]">Add Client to Bolt</h2>
                <button onClick={() => setShowForm(false)} className="text-[#8A8070] hover:text-[#F2EDE4] text-xl">&times;</button>
              </div>
              {error && <div className="bg-red-500/10 text-red-400 text-sm px-4 py-2 rounded-lg mb-4">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Select Client</label>
                  <select value={form.clientId} onChange={(e) => handleClientSelect(e.target.value)} className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" required>
                    <option value="">Choose a client...</option>
                    {agentClients.filter((c) => !configs.some((cfg) => cfg.clientId === c.id)).map((c) => (<option key={c.id} value={c.id}>{c.businessName} — {c.ownerName}</option>))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-[#8A8070] mb-1">Business Name</label><input type="text" value={form.businessName} onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value, clientSlug: slugify(e.target.value) }))} className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" required /></div>
                  <div><label className="block text-xs text-[#8A8070] mb-1">Client Slug</label><input type="text" value={form.clientSlug} onChange={(e) => setForm((f) => ({ ...f, clientSlug: e.target.value }))} className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] font-mono focus:outline-none focus:border-[#C17B2A]" required /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-[#8A8070] mb-1">Phone</label><input type="tel" value={form.businessPhone} onChange={(e) => setForm((f) => ({ ...f, businessPhone: e.target.value }))} className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" required /></div>
                  <div><label className="block text-xs text-[#8A8070] mb-1">Email</label><input type="email" value={form.businessEmail} onChange={(e) => setForm((f) => ({ ...f, businessEmail: e.target.value }))} className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" required /></div>
                </div>
                <div><label className="block text-xs text-[#8A8070] mb-1">Business Address</label><input type="text" value={form.businessAddress} onChange={(e) => setForm((f) => ({ ...f, businessAddress: e.target.value }))} className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" /></div>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-xs text-[#8A8070] mb-1">Trade</label><select value={form.trade} onChange={(e) => setForm((f) => ({ ...f, trade: e.target.value }))} className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" required>{TRADES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div><label className="block text-xs text-[#8A8070] mb-1">Labor Rate ($/hr)</label><input type="number" step="0.01" value={form.laborRatePerHour} onChange={(e) => setForm((f) => ({ ...f, laborRatePerHour: parseFloat(e.target.value) || 0 }))} className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" /></div>
                  <div><label className="block text-xs text-[#8A8070] mb-1">Tax Rate (%)</label><input type="number" step="0.01" value={form.taxRate} onChange={(e) => setForm((f) => ({ ...f, taxRate: parseFloat(e.target.value) || 0 }))} className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" /></div>
                </div>
                <div><label className="block text-xs text-[#8A8070] mb-1">Payment Terms</label><textarea value={form.paymentTerms} onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))} rows={2} className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" /></div>
                <div><label className="block text-xs text-[#8A8070] mb-1">Warranty Terms</label><textarea value={form.warrantyTerms} onChange={(e) => setForm((f) => ({ ...f, warrantyTerms: e.target.value }))} rows={2} className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" /></div>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.escalationClause} onChange={(e) => setForm((f) => ({ ...f, escalationClause: e.target.checked }))} className="accent-[#C17B2A]" /><span className="text-sm text-[#F2EDE4]">Include material price escalation clause</span></label>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className="bg-[#C17B2A] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Save Client Config'}</button>
                  <button type="button" onClick={() => setShowForm(false)} className="border border-[rgba(193,123,42,0.3)] text-[#8A8070] px-6 py-2.5 rounded-lg text-sm hover:text-[#F2EDE4] transition-colors">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
