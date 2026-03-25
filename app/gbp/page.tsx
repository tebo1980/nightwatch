'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

// ─── Types ──────────────────────────────────────────────────────────

interface GbpClient {
  id: string
  businessName: string
  industry: string
  city: string
  state: string
  ownerName: string
}

interface ChecklistItem {
  clientId: string
  itemKey: string
  completed: boolean
  completedAt: string | null
}

// ─── Checklist definitions ──────────────────────────────────────────

const ONE_TIME_ITEMS = [
  { key: 'primary_category', label: 'Primary category set correctly for their trade' },
  { key: 'secondary_categories', label: 'At least 3 secondary service categories added' },
  { key: 'services_listed', label: 'All services listed with descriptions and prices where applicable' },
  { key: 'service_area', label: 'Service area configured with all relevant zip codes' },
  { key: 'business_hours', label: 'Business hours accurate including holiday hours' },
  { key: 'business_description', label: 'Business description written and optimized with keywords' },
  { key: 'website_link', label: 'Website link added and verified' },
  { key: 'phone_number', label: 'Phone number added and call tracking number confirmed' },
  { key: 'booking_link', label: 'Booking link added pointing to Calendly' },
  { key: 'photos_uploaded', label: 'At least 10 photos uploaded including exterior, team, and job photos' },
  { key: 'qa_seeded', label: 'Q and A section seeded with at least 5 common questions and answers' },
  { key: 'first_post', label: 'Google Posts feature activated with first post published' },
  { key: 'review_templates', label: 'Reviews response template saved and in use' },
]

const WEEKLY_ITEMS = [
  { key: 'weekly_photo', label: 'At least one new photo uploaded from a recent job' },
  { key: 'weekly_post', label: 'At least one Google Post published this week' },
  { key: 'weekly_reviews', label: 'Any new reviews responded to within 48 hours' },
  { key: 'weekly_spot_check', label: 'Profile info spot checked for accuracy' },
]

// ─── Helpers ────────────────────────────────────────────────────────

function isThisWeek(dateStr: string | null): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  // Get Monday of current week
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  return d >= monday
}

// ─── Styles ─────────────────────────────────────────────────────────

const card = 'bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)]'
const inputClass = 'bg-[#1E1B16] border border-[rgba(193,123,42,0.3)] text-[#F2EDE4] px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#C17B2A] w-full'
const btnPrimary = 'bg-[#C17B2A] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-50'
const btnSecondary = 'border border-[rgba(193,123,42,0.3)] text-[#C17B2A] px-4 py-2 rounded-lg text-sm hover:bg-[rgba(193,123,42,0.1)] transition-colors disabled:opacity-50'

// ─── Page content (uses searchParams) ───────────────────────────────

function GbpContent() {
  const searchParams = useSearchParams()
  const clientId = searchParams.get('clientId')

  const [client, setClient] = useState<GbpClient | null>(null)
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Post generator state
  const [neighborhood, setNeighborhood] = useState('')
  const [jobType, setJobType] = useState('')
  const [description, setDescription] = useState('')
  const [beforeAfter, setBeforeAfter] = useState('')
  const [generatedPost, setGeneratedPost] = useState('')
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const loadData = useCallback(() => {
    if (!clientId) { setLoading(false); return }
    setLoading(true)
    fetch(`/api/gbp?clientId=${clientId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(true); return }
        setClient(data.client)
        setItems(data.items || [])
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [clientId])

  useEffect(() => { loadData() }, [loadData])

  const toggleItem = async (itemKey: string, currentlyCompleted: boolean) => {
    if (!clientId) return
    const newCompleted = !currentlyCompleted

    // Optimistic update
    setItems((prev) => {
      const existing = prev.find((i) => i.itemKey === itemKey)
      if (existing) {
        return prev.map((i) => i.itemKey === itemKey ? { ...i, completed: newCompleted, completedAt: newCompleted ? new Date().toISOString() : null } : i)
      }
      return [...prev, { clientId, itemKey, completed: newCompleted, completedAt: newCompleted ? new Date().toISOString() : null }]
    })

    await fetch('/api/gbp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, itemKey, completed: newCompleted }),
    })
  }

  const generatePost = async () => {
    if (!client || !neighborhood || !jobType || !description) return
    setGenerating(true)
    setGeneratedPost('')
    try {
      const res = await fetch('/api/gbp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_post',
          clientName: client.businessName,
          trade: client.industry,
          neighborhood,
          jobType,
          description,
          beforeAfter,
        }),
      })
      const data = await res.json()
      setGeneratedPost(data.post || '')
    } catch { /* ignore */ }
    setGenerating(false)
  }

  const copyPost = () => {
    navigator.clipboard.writeText(generatedPost).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ─── Derived state ──────────────────────────────────────────

  const getItem = (key: string) => items.find((i) => i.itemKey === key)
  const isCompleted = (key: string) => getItem(key)?.completed ?? false
  const completedCount = ONE_TIME_ITEMS.filter((i) => isCompleted(i.key)).length
  const totalOneTime = ONE_TIME_ITEMS.length
  const pct = Math.round((completedCount / totalOneTime) * 100)

  // ─── No clientId ────────────────────────────────────────────

  if (!clientId) {
    return (
      <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-4xl mb-4">📍</p>
          <h1 className="text-lg font-medium text-[#F2EDE4] mb-2">GBP Optimization Tool</h1>
          <p className="text-sm text-[#8A8070]">Add <span className="text-[#C17B2A] font-mono">?clientId=</span> to the URL to load a client.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center"><p className="text-[#8A8070]">Loading...</p></div>
  }

  if (error || !client) {
    return <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center"><p className="text-[#8A8070]">Client not found.</p></div>
  }

  // ─── Main UI ────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/" className="text-[#8A8070] text-sm hover:text-[#C17B2A] transition-colors mb-2 inline-block">&larr; Dashboard</Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#F2EDE4] flex items-center gap-2">
                <span>📍</span> GBP Optimization
              </h1>
              <p className="text-sm text-[#8A8070]">{client.businessName} — {client.industry} — {client.city}, {client.state}</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className={card + ' p-4 mb-6'}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8A8070]">One-Time Setup Progress</span>
            <span className="text-sm font-semibold text-[#C17B2A]">{completedCount}/{totalOneTime} ({pct}%)</span>
          </div>
          <div className="w-full bg-[#0E0C0A] rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: pct === 100 ? '#22c55e' : '#C17B2A',
              }}
            />
          </div>
        </div>

        {/* Checklists — side by side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* One-Time Setup */}
          <div className={card + ' p-5'}>
            <h2 className="text-sm font-medium text-[#F2EDE4] mb-4 flex items-center gap-2">
              <span>🔧</span> One-Time Setup Checklist
            </h2>
            <div className="space-y-2">
              {ONE_TIME_ITEMS.map((item) => {
                const done = isCompleted(item.key)
                return (
                  <label key={item.key} className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => toggleItem(item.key, done)}
                      className="mt-0.5 w-4 h-4 rounded border-[rgba(193,123,42,0.3)] bg-[#0E0C0A] text-[#C17B2A] focus:ring-[#C17B2A] focus:ring-offset-0 cursor-pointer accent-[#C17B2A]"
                    />
                    <span className={`text-sm leading-relaxed ${done ? 'text-[#8A8070] line-through' : 'text-[#F2EDE4] group-hover:text-[#C17B2A]'} transition-colors`}>
                      {item.label}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Weekly Maintenance */}
          <div className={card + ' p-5'}>
            <h2 className="text-sm font-medium text-[#F2EDE4] mb-4 flex items-center gap-2">
              <span>📅</span> Weekly Maintenance
              <span className="text-[10px] text-[#8A8070] bg-[#0E0C0A] px-2 py-0.5 rounded-full">Resets every Monday</span>
            </h2>
            <div className="space-y-2">
              {WEEKLY_ITEMS.map((item) => {
                const dbItem = getItem(item.key)
                const done = dbItem?.completed ?? false
                const doneThisWeek = isThisWeek(dbItem?.completedAt ?? null)

                return (
                  <label key={item.key} className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={done && doneThisWeek}
                      onChange={() => toggleItem(item.key, done && doneThisWeek)}
                      className="mt-0.5 w-4 h-4 rounded border-[rgba(193,123,42,0.3)] bg-[#0E0C0A] text-[#C17B2A] focus:ring-[#C17B2A] focus:ring-offset-0 cursor-pointer accent-[#C17B2A]"
                    />
                    <div className="flex-1 flex items-start justify-between gap-2">
                      <span className={`text-sm leading-relaxed ${done && doneThisWeek ? 'text-[#8A8070] line-through' : 'text-[#F2EDE4] group-hover:text-[#C17B2A]'} transition-colors`}>
                        {item.label}
                      </span>
                      {done && doneThisWeek ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 font-medium shrink-0">Done</span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-medium shrink-0">Pending</span>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        </div>

        {/* ─── POST GENERATOR ──────────────────────────────────── */}
        <div className={card + ' p-6'}>
          <h2 className="text-sm font-medium text-[#F2EDE4] mb-4 flex items-center gap-2">
            <span>✍️</span> Google Post Generator
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-[#8A8070] mb-1 block">Client Name</label>
              <input value={client.businessName} readOnly className={inputClass + ' opacity-60'} />
            </div>
            <div>
              <label className="text-xs text-[#8A8070] mb-1 block">Trade</label>
              <input value={client.industry} readOnly className={inputClass + ' opacity-60'} />
            </div>
            <div>
              <label className="text-xs text-[#8A8070] mb-1 block">Neighborhood or City *</label>
              <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className={inputClass} placeholder="e.g. St. Matthews, Jeffersonville" />
            </div>
            <div>
              <label className="text-xs text-[#8A8070] mb-1 block">Job Type *</label>
              <input value={jobType} onChange={(e) => setJobType(e.target.value)} className={inputClass} placeholder="e.g. water heater replacement" />
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs text-[#8A8070] mb-1 block">One sentence about what was done *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass + ' min-h-[80px]'}
              placeholder="e.g. Replaced a 15-year-old 40-gallon gas water heater with a new Bradford White 50-gallon unit..." />
          </div>

          <div className="mb-4">
            <label className="text-xs text-[#8A8070] mb-1 block">Before and after description (optional)</label>
            <textarea value={beforeAfter} onChange={(e) => setBeforeAfter(e.target.value)} className={inputClass + ' min-h-[60px]'}
              placeholder="e.g. Before: rusty tank leaking in basement. After: clean installation with new expansion tank and connections..." />
          </div>

          <button
            onClick={generatePost}
            disabled={generating || !neighborhood || !jobType || !description}
            className={btnPrimary}
          >
            {generating ? '✍️ Generating...' : '✍️ Generate Post'}
          </button>

          {/* Generated output */}
          {generatedPost && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#8A8070]">Generated Post — edit as needed</span>
                <button onClick={copyPost} className={btnSecondary + ' !text-xs !px-3 !py-1.5'}>
                  {copied ? '✓ Copied' : '📋 Copy to Clipboard'}
                </button>
              </div>
              <textarea
                value={generatedPost}
                onChange={(e) => setGeneratedPost(e.target.value)}
                className={inputClass + ' min-h-[200px] text-sm leading-relaxed'}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Exported page ──────────────────────────────────────────────────

export default function GbpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center"><p className="text-[#8A8070]">Loading...</p></div>}>
      <GbpContent />
    </Suspense>
  )
}
