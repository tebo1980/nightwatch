'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Competitor {
  id: string
  competitorName: string
  website: string | null
  monthlyPriceMin: number | null
  monthlyPriceMax: number | null
  setupFee: number | null
  contractLength: string | null
  guaranteeOffered: boolean
  guaranteeDetails: string | null
  keyFeatures: string | null
  weaknesses: string | null
  clientComplaints: string | null
  lastUpdated: string
  notes: string | null
}

const TIERS = ['Starter', 'Complete', 'Agents Only']

const emptyForm = {
  competitorName: '', website: '', monthlyPriceMin: '', monthlyPriceMax: '',
  setupFee: '', contractLength: '', guaranteeOffered: false, guaranteeDetails: '',
  keyFeatures: '', weaknesses: '', clientComplaints: '', notes: '',
}

const inputCls = 'w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] transition-colors placeholder:text-[#8A8070]/50'
const btnPrimary = 'bg-[#C17B2A] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-50'
const btnSecondary = 'border border-[rgba(193,123,42,0.3)] text-[#C17B2A] px-4 py-2 rounded-lg text-sm hover:bg-[rgba(193,123,42,0.1)] transition-colors'

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  // Advantage generator
  const [selectedCompetitorId, setSelectedCompetitorId] = useState('')
  const [selectedTier, setSelectedTier] = useState('Complete')
  const [prospectTrade, setProspectTrade] = useState('')
  const [generating, setGenerating] = useState(false)
  const [talkingPoints, setTalkingPoints] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/competitors')
      .then((r) => r.json())
      .then((data) => setCompetitors(data.competitors || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const set = (field: string, value: string | boolean) => setForm((p) => ({ ...p, [field]: value }))

  const openNew = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (c: Competitor) => {
    setEditingId(c.id)
    setForm({
      competitorName: c.competitorName,
      website: c.website || '',
      monthlyPriceMin: c.monthlyPriceMin?.toString() || '',
      monthlyPriceMax: c.monthlyPriceMax?.toString() || '',
      setupFee: c.setupFee?.toString() || '',
      contractLength: c.contractLength || '',
      guaranteeOffered: c.guaranteeOffered,
      guaranteeDetails: c.guaranteeDetails || '',
      keyFeatures: c.keyFeatures || '',
      weaknesses: c.weaknesses || '',
      clientComplaints: c.clientComplaints || '',
      notes: c.notes || '',
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.competitorName) return
    setSaving(true)
    await fetch('/api/competitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', id: editingId, ...form }),
    })
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    showToast(editingId ? 'Competitor updated!' : 'Competitor added!')
    setSaving(false)
    load()
  }

  const generatePoints = async () => {
    const comp = competitors.find((c) => c.id === selectedCompetitorId)
    if (!comp) return
    setGenerating(true)
    setTalkingPoints('')
    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_talking_points', competitor: comp, baraTrustTier: selectedTier, prospectTrade }),
      })
      const data = await res.json()
      setTalkingPoints(data.talkingPoints || '')
      if (data.talkingPoints) showToast('Talking points generated!')
    } catch { showToast('Generation failed.') }
    setGenerating(false)
  }

  if (loading) return <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center text-[#8A8070]">Loading...</div>

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        {toast && <div className="fixed top-6 right-6 bg-[#1E1B16] border border-[#C17B2A]/30 text-[#F2EDE4] text-sm px-5 py-3 rounded-lg shadow-lg z-50">{toast}</div>}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="text-xs text-[#8A8070] hover:text-[#C17B2A] transition-colors">&larr; Dashboard</Link>
            <h1 className="text-2xl font-semibold text-[#F2EDE4] mt-1 flex items-center gap-2">
              <span>🎯</span> Competitor Intelligence
            </h1>
            <p className="text-sm text-[#8A8070]">Louisville and Southern Indiana market tracking</p>
          </div>
          <button onClick={openNew} className={btnPrimary}>+ New Competitor</button>
        </div>

        {/* ─── FORM ──────────────────────────────────────────── */}
        {showForm && (
          <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.3)] rounded-2xl p-6 mb-6">
            <h2 className="text-sm font-medium text-[#F2EDE4] mb-4">{editingId ? 'Edit Competitor' : 'Add Competitor'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-[#8A8070] mb-1">Name *</label>
                <input className={inputCls} value={form.competitorName} onChange={(e) => set('competitorName', e.target.value)} placeholder="Agency name" />
              </div>
              <div>
                <label className="block text-xs text-[#8A8070] mb-1">Website</label>
                <input className={inputCls} value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <label className="block text-xs text-[#8A8070] mb-1">Monthly Price Min ($)</label>
                <input className={inputCls} type="number" value={form.monthlyPriceMin} onChange={(e) => set('monthlyPriceMin', e.target.value)} placeholder="299" />
              </div>
              <div>
                <label className="block text-xs text-[#8A8070] mb-1">Monthly Price Max ($)</label>
                <input className={inputCls} type="number" value={form.monthlyPriceMax} onChange={(e) => set('monthlyPriceMax', e.target.value)} placeholder="999" />
              </div>
              <div>
                <label className="block text-xs text-[#8A8070] mb-1">Setup Fee ($)</label>
                <input className={inputCls} type="number" value={form.setupFee} onChange={(e) => set('setupFee', e.target.value)} placeholder="500" />
              </div>
              <div>
                <label className="block text-xs text-[#8A8070] mb-1">Contract Length</label>
                <input className={inputCls} value={form.contractLength} onChange={(e) => set('contractLength', e.target.value)} placeholder="e.g. 6 months, 12 months, none" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-3">
                <label className="text-xs text-[#8A8070]">Guarantee Offered</label>
                <button
                  onClick={() => set('guaranteeOffered', !form.guaranteeOffered)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${form.guaranteeOffered ? 'bg-[#C17B2A]' : 'bg-[#2A2520]'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${form.guaranteeOffered ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
              {form.guaranteeOffered && (
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Guarantee Details</label>
                  <input className={inputCls} value={form.guaranteeDetails} onChange={(e) => set('guaranteeDetails', e.target.value)} placeholder="e.g. 90-day money back" />
                </div>
              )}
            </div>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-xs text-[#8A8070] mb-1">Key Features (one per line)</label>
                <textarea className={inputCls + ' min-h-[80px]'} value={form.keyFeatures} onChange={(e) => set('keyFeatures', e.target.value)}
                  placeholder={"SEO management\nGoogle Ads management\nWebsite hosting\nReview management"} />
              </div>
              <div>
                <label className="block text-xs text-[#8A8070] mb-1">Known Weaknesses (one per line)</label>
                <textarea className={inputCls + ' min-h-[60px]'} value={form.weaknesses} onChange={(e) => set('weaknesses', e.target.value)}
                  placeholder={"Long contracts\nNo AI automation\nSlow response times"} />
              </div>
              <div>
                <label className="block text-xs text-[#8A8070] mb-1">Client Complaints (what their clients say)</label>
                <textarea className={inputCls + ' min-h-[60px]'} value={form.clientComplaints} onChange={(e) => set('clientComplaints', e.target.value)}
                  placeholder="Things you've heard from prospects who left them..." />
              </div>
              <div>
                <label className="block text-xs text-[#8A8070] mb-1">Internal Notes</label>
                <textarea className={inputCls + ' min-h-[40px]'} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Todd's notes..." />
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={save} disabled={saving || !form.competitorName} className={btnPrimary}>
                {saving ? 'Saving...' : editingId ? 'Update Competitor' : 'Save Competitor'}
              </button>
              <button onClick={() => { setShowForm(false); setEditingId(null) }} className={btnSecondary}>Cancel</button>
            </div>
          </div>
        )}

        {/* ─── COMPETITOR CARDS ──────────────────────────────── */}
        {competitors.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🎯</p>
            <p className="text-[#8A8070]">No competitors tracked yet.</p>
            <p className="text-xs text-[#8A8070] mt-2">Add your first competitor to start building intelligence.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {competitors.map((c) => (
              <div key={c.id} className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[#F2EDE4]">{c.competitorName}</h3>
                    {c.website && <p className="text-[10px] text-[#8A8070] font-mono">{c.website}</p>}
                  </div>
                  <button onClick={() => openEdit(c)} className="text-[10px] text-[#C17B2A] hover:text-[#D4892F] transition-colors">Edit</button>
                </div>

                {/* Price & Contract */}
                <div className="flex flex-wrap gap-3 mb-3">
                  {(c.monthlyPriceMin || c.monthlyPriceMax) && (
                    <div className="bg-[#0E0C0A] rounded-lg px-3 py-1.5">
                      <span className="text-[10px] text-[#8A8070]">Price: </span>
                      <span className="text-xs text-[#F2EDE4] font-medium">
                        ${c.monthlyPriceMin || '?'}{c.monthlyPriceMax ? `-$${c.monthlyPriceMax}` : ''}/mo
                      </span>
                    </div>
                  )}
                  {c.setupFee && (
                    <div className="bg-[#0E0C0A] rounded-lg px-3 py-1.5">
                      <span className="text-[10px] text-[#8A8070]">Setup: </span>
                      <span className="text-xs text-[#F2EDE4]">${c.setupFee}</span>
                    </div>
                  )}
                  {c.contractLength && (
                    <div className="bg-[#0E0C0A] rounded-lg px-3 py-1.5">
                      <span className="text-[10px] text-[#8A8070]">Contract: </span>
                      <span className="text-xs text-[#F2EDE4]">{c.contractLength}</span>
                    </div>
                  )}
                  <div className={`rounded-lg px-3 py-1.5 ${c.guaranteeOffered ? 'bg-green-500/10' : 'bg-[#0E0C0A]'}`}>
                    <span className={`text-xs ${c.guaranteeOffered ? 'text-green-400' : 'text-[#8A8070]'}`}>
                      {c.guaranteeOffered ? `Guarantee: ${c.guaranteeDetails || 'Yes'}` : 'No guarantee'}
                    </span>
                  </div>
                </div>

                {/* Features */}
                {c.keyFeatures && (
                  <div className="mb-3">
                    <p className="text-[10px] text-[#C17B2A] font-medium mb-1">Features</p>
                    <ul className="space-y-0.5">
                      {c.keyFeatures.split('\n').filter(Boolean).map((f, i) => (
                        <li key={i} className="text-xs text-[#8A8070] flex gap-2">
                          <span className="text-[#C17B2A] shrink-0">+</span>{f.trim()}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Weaknesses */}
                {c.weaknesses && (
                  <div className="mb-3">
                    <p className="text-[10px] text-red-400/80 font-medium mb-1">Weaknesses</p>
                    <ul className="space-y-0.5">
                      {c.weaknesses.split('\n').filter(Boolean).map((w, i) => (
                        <li key={i} className="text-xs text-[#8A8070] flex gap-2">
                          <span className="text-red-400/60 shrink-0">-</span>{w.trim()}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {c.clientComplaints && (
                  <p className="text-[10px] text-[#8A8070] italic mb-2">&ldquo;{c.clientComplaints.slice(0, 120)}{c.clientComplaints.length > 120 ? '...' : ''}&rdquo;</p>
                )}

                <p className="text-[10px] text-[#8A8070]/60">Updated {fmtDate(c.lastUpdated)}</p>
              </div>
            ))}
          </div>
        )}

        {/* ─── ADVANTAGE GENERATOR ───────────────────────────── */}
        {competitors.length > 0 && (
          <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-6">
            <h2 className="text-base font-medium text-[#F2EDE4] mb-1 flex items-center gap-2">
              <span>💬</span> BaraTrust Advantage Generator
            </h2>
            <p className="text-xs text-[#8A8070] mb-5">Generate honest talking points for sales conversations when a prospect mentions a competitor.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs text-[#8A8070] mb-1">Competitor</label>
                <select className={inputCls} value={selectedCompetitorId} onChange={(e) => setSelectedCompetitorId(e.target.value)}>
                  <option value="">Select competitor...</option>
                  {competitors.map((c) => <option key={c.id} value={c.id}>{c.competitorName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#8A8070] mb-1">BaraTrust Tier</label>
                <select className={inputCls} value={selectedTier} onChange={(e) => setSelectedTier(e.target.value)}>
                  {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#8A8070] mb-1">Prospect Trade (optional)</label>
                <input className={inputCls} value={prospectTrade} onChange={(e) => setProspectTrade(e.target.value)} placeholder="e.g. plumber" />
              </div>
            </div>

            <button onClick={generatePoints} disabled={generating || !selectedCompetitorId} className={btnPrimary}>
              {generating ? '💬 Generating...' : '💬 Generate Talking Points'}
            </button>

            {talkingPoints && (
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#8A8070]">Talking points — edit as needed</span>
                  <button onClick={() => { navigator.clipboard.writeText(talkingPoints); showToast('Copied!') }}
                    className="text-xs border border-[rgba(193,123,42,0.3)] text-[#C17B2A] px-3 py-1.5 rounded-lg hover:bg-[rgba(193,123,42,0.1)] transition-colors">
                    📋 Copy
                  </button>
                </div>
                <textarea className={inputCls + ' min-h-[200px] text-sm leading-relaxed'} value={talkingPoints} onChange={(e) => setTalkingPoints(e.target.value)} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
