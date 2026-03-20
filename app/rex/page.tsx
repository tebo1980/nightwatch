'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface AgentClientBasic {
  id: string
  businessName: string
  rexEnabled: boolean
}

interface ReviewData {
  id: string
  clientId: string
  platform: string
  externalId: string | null
  reviewerName: string
  rating: number
  reviewText: string
  reviewDate: string
  draftResponse: string | null
  finalResponse: string | null
  status: string
  createdAt: string
}

type Tab = 'pending' | 'drafted' | 'approved' | 'all'

const PLATFORM_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  google: { label: 'Google', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  yelp: { label: 'Yelp', bg: 'bg-red-500/20', text: 'text-red-400' },
  facebook: { label: 'Facebook', bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  manual: { label: 'Manual', bg: 'bg-gray-500/20', text: 'text-gray-400' },
}

export default function RexDashboard() {
  const [clients, setClients] = useState<AgentClientBasic[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [reviews, setReviews] = useState<ReviewData[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')
  const [scraping, setScraping] = useState(false)
  const [sendingReport, setSendingReport] = useState(false)
  const [toast, setToast] = useState('')
  const [editDrafts, setEditDrafts] = useState<Record<string, string>>({})
  const [regenerating, setRegenerating] = useState<Record<string, boolean>>({})
  const [showAddReview, setShowAddReview] = useState(false)
  const [manualReview, setManualReview] = useState({
    platform: 'manual', reviewerName: '', rating: 5, reviewText: '', reviewDate: '',
  })

  // Load Rex-enabled clients
  useEffect(() => {
    fetch('/api/agent-clients')
      .then((r) => r.json())
      .then((data) => {
        const rexClients = (data.clients || []).filter((c: AgentClientBasic) => c.rexEnabled)
        setClients(rexClients)
        if (rexClients.length > 0) setSelectedClientId(rexClients[0].id)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const fetchReviews = useCallback(() => {
    if (!selectedClientId) return
    fetch(`/api/rex/reviews?clientId=${selectedClientId}`)
      .then((r) => r.json())
      .then((data) => {
        setReviews(data.reviews || [])
        // Pre-fill editable drafts
        const drafts: Record<string, string> = {}
        for (const r of data.reviews || []) {
          if (r.draftResponse) drafts[r.id] = r.draftResponse
        }
        setEditDrafts(drafts)
      })
      .catch(() => {})
  }, [selectedClientId])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const handleScrape = async () => {
    setScraping(true)
    try {
      const res = await fetch('/api/rex/scrape', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        const total = data.processed?.reduce((s: number, p: { newReviews: number }) => s + p.newReviews, 0) || 0
        showToast(total > 0 ? `Found ${total} new review${total > 1 ? 's' : ''}!` : 'No new reviews found.')
        fetchReviews()
      } else {
        showToast('Scrape failed.')
      }
    } catch { showToast('Scrape error.') }
    finally { setScraping(false) }
  }

  const handleWeeklyReport = async () => {
    if (!selectedClientId) return
    setSendingReport(true)
    try {
      const res = await fetch('/api/rex/weekly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClientId }),
      })
      const data = await res.json()
      showToast(data.success ? 'Weekly report sent!' : 'Report failed.')
    } catch { showToast('Report error.') }
    finally { setSendingReport(false) }
  }

  const handleRegenerate = async (reviewId: string) => {
    setRegenerating((p) => ({ ...p, [reviewId]: true }))
    try {
      const res = await fetch('/api/rex/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId }),
      })
      const data = await res.json()
      if (data.success && data.review) {
        setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, ...data.review } : r))
        if (data.review.draftResponse) setEditDrafts((p) => ({ ...p, [reviewId]: data.review.draftResponse }))
        showToast('Draft regenerated!')
      }
    } catch { showToast('Regenerate failed.') }
    finally { setRegenerating((p) => ({ ...p, [reviewId]: false })) }
  }

  const handleApprove = async (reviewId: string) => {
    const finalResponse = editDrafts[reviewId]
    if (!finalResponse) return
    try {
      const res = await fetch('/api/rex/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, finalResponse }),
      })
      const data = await res.json()
      if (data.success) {
        setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, ...data.review } : r))
        showToast('Response approved!')
      }
    } catch { showToast('Approve failed.') }
  }

  const handleAddManualReview = async () => {
    if (!selectedClientId || !manualReview.reviewerName || !manualReview.reviewText) return
    try {
      const res = await fetch('/api/rex/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...manualReview, clientId: selectedClientId }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('Review added! Generating draft...')
        setManualReview({ platform: 'manual', reviewerName: '', rating: 5, reviewText: '', reviewDate: '' })
        setShowAddReview(false)
        // Auto-draft for the new review
        await fetch('/api/rex/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewId: data.review.id }),
        })
        fetchReviews()
      }
    } catch { showToast('Failed to add review.') }
  }

  const filtered = tab === 'all' ? reviews : reviews.filter((r) => r.status === tab)

  const totalReviews = reviews.length
  const avgRating = totalReviews > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / totalReviews : 0
  const pendingCount = reviews.filter((r) => r.status === 'pending').length
  const draftedCount = reviews.filter((r) => r.status === 'drafted').length
  const approvedCount = reviews.filter((r) => r.status === 'approved').length

  const stars = (n: number) => Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={i < n ? 'text-amber-400' : 'text-[#2A2520]'}>&#9733;</span>
  ))

  const inputCls = 'w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] transition-colors placeholder:text-[#8A8070]/50'

  if (loading) return <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center text-[#8A8070]">Loading...</div>

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
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
            <h1 className="text-2xl font-semibold text-[#F2EDE4] mt-1">Rex — Review Manager</h1>
            <p className="text-sm text-[#8A8070]">Monitor reviews, draft responses, protect reputation</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleScrape} disabled={scraping} className="bg-[#C17B2A] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-50">
              {scraping ? 'Scraping...' : 'Scrape Now'}
            </button>
            <button onClick={handleWeeklyReport} disabled={sendingReport || !selectedClientId} className="border border-[rgba(193,123,42,0.3)] text-[#C17B2A] px-4 py-2 rounded-lg text-sm hover:bg-[rgba(193,123,42,0.1)] transition-colors disabled:opacity-50">
              {sendingReport ? 'Sending...' : 'Send Weekly Report'}
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
            {clients.length === 0 && <option value="">No Rex-enabled clients</option>}
            {clients.map((c) => <option key={c.id} value={c.id}>{c.businessName}</option>)}
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
            <div className="text-2xl font-semibold text-[#C17B2A]">{totalReviews}</div>
            <div className="text-xs text-[#8A8070] mt-1">Total Reviews</div>
          </div>
          <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
            <div className="text-2xl font-semibold text-[#C17B2A]">{avgRating.toFixed(1)}</div>
            <div className="text-xs text-[#8A8070] mt-1 flex gap-0.5">{stars(Math.round(avgRating))}</div>
          </div>
          <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
            <div className="text-2xl font-semibold text-[#C17B2A]">{pendingCount + draftedCount}</div>
            <div className="text-xs text-[#8A8070] mt-1">Pending Responses</div>
          </div>
          <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
            <div className="text-2xl font-semibold text-[#C17B2A]">{approvedCount}</div>
            <div className="text-xs text-[#8A8070] mt-1">Approved</div>
          </div>
        </div>

        {/* Add Manual Review */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddReview(!showAddReview)}
            className="text-sm text-[#C17B2A] hover:text-[#D4892F] transition-colors"
          >
            {showAddReview ? '— Hide' : '+ Add Manual Review'}
          </button>
          {showAddReview && (
            <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-5 mt-3 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1.5">Platform</label>
                  <select className={inputCls} value={manualReview.platform} onChange={(e) => setManualReview((p) => ({ ...p, platform: e.target.value }))}>
                    <option value="manual">Manual</option>
                    <option value="google">Google</option>
                    <option value="yelp">Yelp</option>
                    <option value="facebook">Facebook</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1.5">Reviewer Name</label>
                  <input className={inputCls} value={manualReview.reviewerName} onChange={(e) => setManualReview((p) => ({ ...p, reviewerName: e.target.value }))} placeholder="Jane Doe" />
                </div>
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1.5">Rating</label>
                  <div className="flex gap-1 pt-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => setManualReview((p) => ({ ...p, rating: n }))} className={`text-2xl ${n <= manualReview.rating ? 'text-amber-400' : 'text-[#2A2520]'}`}>&#9733;</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#8A8070] mb-1.5">Review Text</label>
                <textarea className={inputCls + ' min-h-[80px]'} value={manualReview.reviewText} onChange={(e) => setManualReview((p) => ({ ...p, reviewText: e.target.value }))} placeholder="The customer's review..." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1.5">Review Date</label>
                  <input type="date" className={inputCls} value={manualReview.reviewDate} onChange={(e) => setManualReview((p) => ({ ...p, reviewDate: e.target.value }))} />
                </div>
                <div className="flex items-end">
                  <button onClick={handleAddManualReview} className="bg-[#C17B2A] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors">Add & Auto-Draft</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#1E1B16] rounded-lg p-1 w-fit">
          {([
            { key: 'all', label: `All (${reviews.length})` },
            { key: 'pending', label: `Pending (${pendingCount})` },
            { key: 'drafted', label: `Drafted (${draftedCount})` },
            { key: 'approved', label: `Approved (${approvedCount})` },
          ] as { key: Tab; label: string }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-md text-sm transition-colors ${tab === t.key ? 'bg-[#C17B2A] text-white' : 'text-[#8A8070] hover:text-[#F2EDE4]'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Review Cards */}
        {filtered.length === 0 ? (
          <div className="text-center text-[#8A8070] py-16">No reviews in this category.</div>
        ) : (
          <div className="space-y-4">
            {filtered.map((review) => {
              const ps = PLATFORM_STYLES[review.platform] || PLATFORM_STYLES.manual
              return (
                <div key={review.id} className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-5">
                  {/* Header */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ps.bg} ${ps.text}`}>{ps.label}</span>
                    <span className="flex">{stars(review.rating)}</span>
                    <span className="text-sm font-medium text-[#F2EDE4]">{review.reviewerName}</span>
                    <span className="text-xs text-[#8A8070]">{new Date(review.reviewDate).toLocaleDateString()}</span>
                    {review.status === 'approved' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">Approved</span>}
                  </div>

                  {/* Review Text */}
                  <p className="text-sm text-[#F2EDE4] mb-4 leading-relaxed">&ldquo;{review.reviewText}&rdquo;</p>

                  {/* Draft / Approved Response */}
                  {review.status === 'approved' && review.finalResponse ? (
                    <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                      <p className="text-xs text-green-400 mb-2 font-medium">Approved Response</p>
                      <p className="text-sm text-[#F2EDE4] leading-relaxed">{review.finalResponse}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-[#8A8070]">Draft Response</p>
                      <textarea
                        className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.15)] rounded-lg px-4 py-3 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A] min-h-[100px] transition-colors"
                        value={editDrafts[review.id] || ''}
                        onChange={(e) => setEditDrafts((p) => ({ ...p, [review.id]: e.target.value }))}
                        placeholder={review.status === 'pending' ? 'Waiting for draft generation...' : ''}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRegenerate(review.id)}
                          disabled={regenerating[review.id]}
                          className="border border-[rgba(193,123,42,0.3)] text-[#C17B2A] px-4 py-2 rounded-lg text-sm hover:bg-[rgba(193,123,42,0.1)] transition-colors disabled:opacity-50"
                        >
                          {regenerating[review.id] ? 'Regenerating...' : 'Regenerate'}
                        </button>
                        <button
                          onClick={() => handleApprove(review.id)}
                          disabled={!editDrafts[review.id]}
                          className="bg-[#C17B2A] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-40"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
