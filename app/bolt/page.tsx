'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

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

interface EstimateRow {
  id: string
  estimateNumber: string
  customerName: string
  jobType: string
  totalAmount: number
  status: string
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
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function BoltAdmin() {
  const [configs, setConfigs] = useState<BoltConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [viewEstimates, setViewEstimates] = useState<string | null>(null)
  const [estimates, setEstimates] = useState<EstimateRow[]>([])
  const [estimatesLoading, setEstimatesLoading] = useState(false)
  const [agentClients, setAgentClients] = useState<AgentClient[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [form, setForm] = useState({
    clientId: '',
    clientSlug: '',
    businessName: '',
    businessPhone: '',
    businessEmail: '',
    businessAddress: '',
    logoUrl: '',
    licenseNumber: '',
    insuranceInfo: '',
    trade: 'Plumber',
    laborRatePerHour: 75,
    minimumJobSize: 150,
    taxRate: 0,
    paymentTerms: '50% deposit required to schedule. Balance due upon completion.',
    warrantyTerms: 'All work warranted for 1 year from completion date.',
    validityDays: 14,
    escalationClause: true,
  })

  useEffect(() => {
    loadConfigs()
  }, [])

  function loadConfigs() {
    setLoading(true)
    fetch('/api/bolt/config')
      .then((r) => r.json())
      .then((data) => setConfigs(data.configs || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  function loadAgentClients() {
    fetch('/api/agent-clients')
      .then((r) => r.json())
      .then((data) => setAgentClients(data.clients || []))
      .catch(() => {})
  }

  function openForm() {
    setShowForm(true)
    setError('')
    loadAgentClients()
  }

  function handleClientSelect(clientId: string) {
    const client = agentClients.find((c) => c.id === clientId)
    if (client) {
      setForm((f) => ({
        ...f,
        clientId,
        businessName: client.businessName,
        businessPhone: client.contactPhone || '',
        businessEmail: client.ownerEmail || '',
        clientSlug: slugify(client.businessName),
      }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/bolt/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to save')
        return
      }
      setShowForm(false)
      setForm({
        clientId: '', clientSlug: '', businessName: '', businessPhone: '',
        businessEmail: '', businessAddress: '', logoUrl: '', licenseNumber: '',
        insuranceInfo: '', trade: 'Plumber', laborRatePerHour: 75, minimumJobSize: 150,
        taxRate: 0, paymentTerms: '50% deposit required to schedule. Balance due upon completion.',
        warrantyTerms: 'All work warranted for 1 year from completion date.',
        validityDays: 14, escalationClause: true,
      })
      loadConfigs()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  function loadEstimates(clientId: string) {
    setViewEstimates(clientId)
    setEstimatesLoading(true)
    fetch(`/api/bolt/estimates?clientId=${clientId}`)
      .then((r) => r.json())
      .then((data) => setEstimates(data.estimates || []))
      .catch(() => {})
      .finally(() => setEstimatesLoading(false))
  }

  const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-gray-500/20 text-gray-400',
    sent: 'bg-blue-500/20 text-blue-400',
    approved: 'bg-green-500/20 text-green-400',
    declined: 'bg-red-500/20 text-red-400',
  }

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/" className="text-[#8A8070] hover:text-[#C17B2A] transition-colors text-sm">&larr; Dashboard</Link>
            </div>
            <h1 className="text-2xl font-semibold text-[#C17B2A] mt-2">&#9889; Bolt</h1>
            <p className="text-sm text-[#8A8070]">On-Site Estimate Builder</p>
          </div>
          <button
            onClick={openForm}
            className="bg-[#C17B2A] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> Add Client to Bolt
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
            <div className="text-2xl font-semibold text-[#C17B2A]">{configs.length}</div>
            <div className="text-xs text-[#8A8070] mt-1">Clients Configured</div>
          </div>
          <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
            <div className="text-2xl font-semibold text-[#C17B2A]">{configs.reduce((s, c) => s + c.estimateCount, 0)}</div>
            <div className="text-xs text-[#8A8070] mt-1">Total Estimates</div>
          </div>
          <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
            <div className="text-2xl font-semibold text-[#C17B2A]">{new Set(configs.map((c) => c.trade)).size}</div>
            <div className="text-xs text-[#8A8070] mt-1">Trades Active</div>
          </div>
          <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
            <div className="text-2xl font-semibold text-[#C17B2A]">${configs.length > 0 ? Math.round(configs.reduce((s, c) => s + c.laborRatePerHour, 0) / configs.length) : 0}</div>
            <div className="text-xs text-[#8A8070] mt-1">Avg Labor Rate</div>
          </div>
        </div>

        {/* Client List */}
        {loading ? (
          <div className="text-center text-[#8A8070] py-20">Loading...</div>
        ) : configs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#8A8070] mb-4">No clients configured for Bolt yet</p>
            <button onClick={openForm} className="bg-[#C17B2A] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors">
              Add Your First Client
            </button>
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
                  <th className="text-right text-[#8A8070] font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((config) => (
                  <tr key={config.id} className="border-b border-[rgba(193,123,42,0.08)] hover:bg-[rgba(193,123,42,0.05)]">
                    <td className="px-4 py-3 text-[#F2EDE4] font-medium">{config.businessName}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`/bolt/${config.clientSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#C17B2A] hover:underline text-xs font-mono"
                      >
                        /bolt/{config.clientSlug}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-[#8A8070]">{config.trade}</td>
                    <td className="px-4 py-3 text-center text-[#F2EDE4]">{config.estimateCount}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => loadEstimates(config.clientId)}
                        className="text-[#C17B2A] hover:underline text-xs"
                      >
                        View Estimates
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Estimates Panel */}
        {viewEstimates && (
          <div className="mt-6 bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-medium text-[#F2EDE4]">
                Estimates for {configs.find((c) => c.clientId === viewEstimates)?.businessName}
              </h2>
              <button onClick={() => setViewEstimates(null)} className="text-[#8A8070] hover:text-[#F2EDE4] text-sm">&times; Close</button>
            </div>
            {estimatesLoading ? (
              <p className="text-[#8A8070] text-sm py-4">Loading...</p>
            ) : estimates.length === 0 ? (
              <p className="text-[#8A8070] text-sm py-4">No estimates yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(193,123,42,0.15)]">
                    <th className="text-left text-[#8A8070] font-medium px-3 py-2">Estimate #</th>
                    <th className="text-left text-[#8A8070] font-medium px-3 py-2">Customer</th>
                    <th className="text-left text-[#8A8070] font-medium px-3 py-2">Job Type</th>
                    <th className="text-right text-[#8A8070] font-medium px-3 py-2">Amount</th>
                    <th className="text-center text-[#8A8070] font-medium px-3 py-2">Status</th>
                    <th className="text-right text-[#8A8070] font-medium px-3 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {estimates.map((est) => (
                    <tr key={est.id} className="border-b border-[rgba(193,123,42,0.08)]">
                      <td className="px-3 py-2 text-[#F2EDE4] font-mono text-xs">{est.estimateNumber}</td>
                      <td className="px-3 py-2 text-[#F2EDE4]">{est.customerName}</td>
                      <td className="px-3 py-2 text-[#8A8070]">{est.jobType}</td>
                      <td className="px-3 py-2 text-right text-[#F2EDE4] font-medium">${est.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[est.status] || 'bg-gray-500/20 text-gray-400'}`}>
                          {est.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-[#8A8070] text-xs">{new Date(est.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Add Client Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-10 z-50 overflow-y-auto">
            <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.3)] p-6 w-full max-w-2xl mx-4 mb-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-[#F2EDE4]">Add Client to Bolt</h2>
                <button onClick={() => setShowForm(false)} className="text-[#8A8070] hover:text-[#F2EDE4] text-xl">&times;</button>
              </div>

              {error && <div className="bg-red-500/10 text-red-400 text-sm px-4 py-2 rounded-lg mb-4">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Client selector */}
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Select Client</label>
                  <select
                    value={form.clientId}
                    onChange={(e) => handleClientSelect(e.target.value)}
                    className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]"
                    required
                  >
                    <option value="">Choose a client...</option>
                    {agentClients
                      .filter((c) => !configs.some((cfg) => cfg.clientId === c.id))
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.businessName} — {c.ownerName}</option>
                      ))}
                  </select>
                </div>

                {/* Business details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#8A8070] mb-1">Business Name</label>
                    <input type="text" value={form.businessName} onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value, clientSlug: slugify(e.target.value) }))} className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" required />
                  </div>
                  <div>
                    <label className="block text-xs text-[#8A8070] mb-1">Client Slug</label>
                    <input type="text" value={form.clientSlug} onChange={(e) => setForm((f) => ({ ...f, clientSlug: e.target.value }))} className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] font-mono focus:outline-none focus:border-[#C17B2A]" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#8A8070] mb-1">Phone</label>
                    <input type="tel" value={form.businessPhone} onChange={(e) => setForm((f) => ({ ...f, businessPhone: e.target.value }))} className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" required />
                  </div>
                  <div>
                    <label className="block text-xs text-[#8A8070] mb-1">Email</label>
                    <input type="email" value={form.businessEmail} onChange={(e) => setForm((f) => ({ ...f, businessEmail: e.target.value }))} className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" required />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Business Address</label>
                  <input type="text" value={form.businessAddress} onChange={(e) => setForm((f) => ({ ...f, businessAddress: e.target.value }))} className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#8A8070] mb-1">Logo URL (optional)</label>
                    <input type="url" value={form.logoUrl} onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))} className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#8A8070] mb-1">License Number (optional)</label>
                    <input type="text" value={form.licenseNumber} onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))} className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Insurance Info (optional)</label>
                  <input type="text" value={form.insuranceInfo} onChange={(e) => setForm((f) => ({ ...f, insuranceInfo: e.target.value }))} className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" />
                </div>

                {/* Trade & Rates */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-[#8A8070] mb-1">Trade</label>
                    <select value={form.trade} onChange={(e) => setForm((f) => ({ ...f, trade: e.target.value }))} className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" required>
                      {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#8A8070] mb-1">Labor Rate ($/hr)</label>
                    <input type="number" step="0.01" value={form.laborRatePerHour} onChange={(e) => setForm((f) => ({ ...f, laborRatePerHour: parseFloat(e.target.value) || 0 }))} className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#8A8070] mb-1">Min Job Size ($)</label>
                    <input type="number" step="0.01" value={form.minimumJobSize} onChange={(e) => setForm((f) => ({ ...f, minimumJobSize: parseFloat(e.target.value) || 0 }))} className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#8A8070] mb-1">Tax Rate (%)</label>
                    <input type="number" step="0.01" value={form.taxRate} onChange={(e) => setForm((f) => ({ ...f, taxRate: parseFloat(e.target.value) || 0 }))} className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#8A8070] mb-1">Validity (days)</label>
                    <input type="number" value={form.validityDays} onChange={(e) => setForm((f) => ({ ...f, validityDays: parseInt(e.target.value) || 14 }))} className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Payment Terms</label>
                  <textarea value={form.paymentTerms} onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))} rows={2} className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" />
                </div>

                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Warranty Terms</label>
                  <textarea value={form.warrantyTerms} onChange={(e) => setForm((f) => ({ ...f, warrantyTerms: e.target.value }))} rows={2} className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" />
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.escalationClause} onChange={(e) => setForm((f) => ({ ...f, escalationClause: e.target.checked }))} className="accent-[#C17B2A]" />
                    <span className="text-sm text-[#F2EDE4]">Include material price escalation clause</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className="bg-[#C17B2A] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Client Config'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="border border-[rgba(193,123,42,0.3)] text-[#8A8070] px-6 py-2.5 rounded-lg text-sm hover:text-[#F2EDE4] transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
