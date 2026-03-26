'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface AgentClientBasic { id: string; businessName: string; sageEnabled: boolean }

interface HistoryEntry { timestamp: number; clientName: string; content: string }

const PLATFORMS = ['Facebook', 'Instagram', 'Google Business Profile']
const TONES = ['Professional', 'Friendly and Casual', 'Bold and Direct', 'Warm and Local']
const COUNTS = [1, 3, 5, 7]

function parsePlatformPosts(content: string, platforms: string[]): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  const headers = ['FACEBOOK', 'INSTAGRAM', 'GOOGLE BUSINESS PROFILE']
  for (const platform of platforms) {
    const header = headers.find((h) => platform.toUpperCase().startsWith(h.split(' ')[0])) || platform.toUpperCase()
    const regex = new RegExp(`${header}[\\s\\S]*?(?=(${headers.filter((h) => h !== header).join('|')})|$)`, 'i')
    const match = content.match(regex)
    if (match) {
      const section = match[0].replace(new RegExp(`^${header}\\s*`, 'i'), '').trim()
      const posts = section.split(/Post \d+:\s*/i).filter((p) => p.trim())
      result[platform] = posts.map((p) => p.trim())
    }
  }
  return result
}

export default function SageDashboard() {
  const [clients, setClients] = useState<AgentClientBasic[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  // Form
  const [businessUpdate, setBusinessUpdate] = useState('')
  const [tone, setTone] = useState(TONES[1])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([...PLATFORMS])
  const [postsPerPlatform, setPostsPerPlatform] = useState(3)
  const [keywords, setKeywords] = useState('')
  const [generating, setGenerating] = useState(false)

  // Output
  const [rawContent, setRawContent] = useState('')
  const [parsedPosts, setParsedPosts] = useState<Record<string, string[]>>({})

  // History
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [expandedHistory, setExpandedHistory] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/agent-clients')
      .then((r) => r.json())
      .then((data) => {
        const sageClients = (data.clients || []).filter((c: AgentClientBasic) => c.sageEnabled)
        setClients(sageClients)
        if (sageClients.length > 0) setSelectedClientId(sageClients[0].id)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedClientId) return
    try {
      const all: HistoryEntry[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(`sage_history_${selectedClientId}_`)) {
          const val = localStorage.getItem(key)
          if (val) all.push(JSON.parse(val))
        }
      }
      all.sort((a, b) => b.timestamp - a.timestamp)
      setHistory(all.slice(0, 5))
    } catch { setHistory([]) }
  }, [selectedClientId, rawContent])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }

  const handleGenerate = async () => {
    if (!selectedClientId || !businessUpdate || selectedPlatforms.length === 0) return
    setGenerating(true)
    setRawContent('')
    setParsedPosts({})
    try {
      const res = await fetch('/api/sage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClientId, businessUpdate, tone, platforms: selectedPlatforms, postsPerPlatform, keywords }),
      })
      const data = await res.json()
      if (data.success && data.content) {
        setRawContent(data.content)
        setParsedPosts(parsePlatformPosts(data.content, selectedPlatforms))
        showToast('Posts drafted!')
      } else {
        showToast(data.error || 'Generation failed.')
      }
    } catch { showToast('Generation error.') }
    finally { setGenerating(false) }
  }

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    showToast('Copied!')
  }

  const handleSaveHistory = () => {
    if (!rawContent || !selectedClientId) return
    const clientName = clients.find((c) => c.id === selectedClientId)?.businessName || ''
    const entry: HistoryEntry = { timestamp: Date.now(), clientName, content: rawContent }
    localStorage.setItem(`sage_history_${selectedClientId}_${entry.timestamp}`, JSON.stringify(entry))
    showToast('Saved to history!')
    // refresh history list
    setRawContent((prev) => prev) // trigger re-render
  }

  const inputCls = 'w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] transition-colors placeholder:text-[#8A8070]/50'

  const platformColors: Record<string, string> = {
    'Facebook': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Instagram': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    'Google Business Profile': 'bg-green-500/20 text-green-400 border-green-500/30',
  }

  if (loading) return <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center text-[#8A8070]">Loading...</div>

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        {toast && <div className="fixed top-6 right-6 bg-[#1E1B16] border border-[#C17B2A]/30 text-[#F2EDE4] text-sm px-5 py-3 rounded-lg shadow-lg z-50">{toast}</div>}

        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-xs text-[#8A8070] hover:text-[#C17B2A] transition-colors">&larr; Dashboard</Link>
          <h1 className="text-2xl font-semibold text-[#C17B2A] mt-1">Sage</h1>
          <p className="text-sm text-[#8A8070]">Social Media Drafting Agent</p>
        </div>

        {/* Client Selector */}
        <div className="mb-6">
          <select className="bg-[#1E1B16] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] w-full md:w-72" value={selectedClientId} onChange={(e) => { setSelectedClientId(e.target.value); setRawContent(''); setParsedPosts({}) }}>
            {clients.length === 0 && <option value="">No Sage-enabled clients</option>}
            {clients.map((c) => <option key={c.id} value={c.id}>{c.businessName}</option>)}
          </select>
        </div>

        {/* ─── COMMUNITY GROUP MODE (prominent, above calendar) ── */}
        <CommunityGroupMode
          clientId={selectedClientId}
          clientName={clients.find((c) => c.id === selectedClientId)?.businessName || ''}
          showToast={showToast}
        />

        {/* ─── MONTHLY CALENDAR (full width, above grid) ──────── */}
        <CalendarSection
          clientName={clients.find((c) => c.id === selectedClientId)?.businessName || ''}
          showToast={showToast}
        />

        {/* ─── STORM RESPONSE (full width, always visible) ──── */}
        <StormResponseSection
          clientName={clients.find((c) => c.id === selectedClientId)?.businessName || ''}
          showToast={showToast}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-6 space-y-4">
              <h2 className="text-base font-medium text-[#F2EDE4]">What happened this week?</h2>

              <textarea
                className={inputCls + ' min-h-[100px]'}
                value={businessUpdate}
                onChange={(e) => setBusinessUpdate(e.target.value)}
                placeholder="e.g. Completed 3 HVAC installs in New Albany. Running a 10% off tune-up special through end of month."
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1.5">Tone</label>
                  <select className={inputCls} value={tone} onChange={(e) => setTone(e.target.value)}>
                    {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1.5">Posts per platform</label>
                  <select className={inputCls} value={postsPerPlatform} onChange={(e) => setPostsPerPlatform(Number(e.target.value))}>
                    {COUNTS.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#8A8070] mb-2">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        selectedPlatforms.includes(p)
                          ? platformColors[p]
                          : 'border-[rgba(193,123,42,0.2)] text-[#8A8070]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#8A8070] mb-1.5">Hashtags or keywords (optional)</label>
                <input className={inputCls} value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="#HVAC #NewAlbany #LocalBusiness" />
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || !businessUpdate || selectedPlatforms.length === 0}
                className="w-full bg-[#C17B2A] text-white py-3 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {generating ? 'Drafting posts...' : 'Draft My Posts'}
              </button>
            </div>

            {/* Output */}
            {Object.keys(parsedPosts).length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-medium text-[#F2EDE4]">Drafted Posts</h2>
                  <div className="flex gap-2">
                    <button onClick={handleSaveHistory} className="text-xs border border-[rgba(193,123,42,0.3)] text-[#C17B2A] px-3 py-1.5 rounded-lg hover:bg-[rgba(193,123,42,0.1)] transition-colors">Save to History</button>
                    <button onClick={handleGenerate} disabled={generating} className="text-xs border border-[rgba(193,123,42,0.3)] text-[#C17B2A] px-3 py-1.5 rounded-lg hover:bg-[rgba(193,123,42,0.1)] transition-colors disabled:opacity-50">Regenerate</button>
                  </div>
                </div>

                {Object.entries(parsedPosts).map(([platform, posts]) => (
                  <div key={platform} className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${platformColors[platform] || 'text-[#8A8070] border-[#8A8070]/30'}`}>{platform}</span>
                      <span className="text-xs text-[#8A8070]">{posts.length} post{posts.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="space-y-3">
                      {posts.map((post, i) => (
                        <div key={i} className="bg-[#0E0C0A] rounded-lg p-4 border border-[rgba(193,123,42,0.1)]">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <span className="text-[10px] text-[#8A8070] font-medium">Post {i + 1}</span>
                            <button onClick={() => handleCopy(post)} className="text-[10px] text-[#C17B2A] hover:text-[#D4892F] transition-colors shrink-0">Copy</button>
                          </div>
                          <p className="text-sm text-[#F2EDE4] whitespace-pre-line leading-relaxed">{post}</p>
                          <p className="text-[10px] text-[#8A8070] mt-2">{post.length} characters</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-6">
                <h2 className="text-base font-medium text-[#F2EDE4] mb-4">Recent History</h2>
                <div className="space-y-2">
                  {history.map((entry) => (
                    <div key={entry.timestamp}>
                      <button
                        onClick={() => setExpandedHistory(expandedHistory === entry.timestamp ? null : entry.timestamp)}
                        className="w-full text-left bg-[#0E0C0A] rounded-lg px-4 py-3 border border-[rgba(193,123,42,0.1)] hover:border-[rgba(193,123,42,0.25)] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[#8A8070] w-24 shrink-0">{new Date(entry.timestamp).toLocaleDateString()}</span>
                          <span className="text-sm text-[#F2EDE4] truncate">{entry.content.substring(0, 80)}...</span>
                        </div>
                      </button>
                      {expandedHistory === entry.timestamp && (
                        <div className="bg-[#0E0C0A] border border-[rgba(193,123,42,0.1)] border-t-0 rounded-b-lg px-4 py-4">
                          <p className="text-sm text-[#F2EDE4] whitespace-pre-line">{entry.content}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Post Length Guide (desktop only) */}
          <div className="hidden lg:block">
            <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-5 sticky top-6">
              <h3 className="text-sm font-medium text-[#F2EDE4] mb-4">Post Length Guide</h3>
              <div className="space-y-4 text-xs text-[#8A8070]">
                <div>
                  <p className="text-[#F2EDE4] font-medium mb-1">Facebook</p>
                  <p>100-250 words ideal</p>
                </div>
                <div>
                  <p className="text-[#F2EDE4] font-medium mb-1">Instagram</p>
                  <p>Under 150 words + hashtags</p>
                </div>
                <div>
                  <p className="text-[#F2EDE4] font-medium mb-1">Google Business Profile</p>
                  <p>Under 300 words, include a call to action</p>
                </div>
                <hr className="border-[rgba(193,123,42,0.15)]" />
                <div>
                  <p className="text-[#F2EDE4] font-medium mb-1">Best Posting Times</p>
                  <p>Tue-Thu, 7-9am and 5-7pm</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Calendar Post type ─────────────────────────────────────────────

interface CalendarPost {
  number: number
  week: string
  platform: string
  type: string
  text: string
  note: string
}

const PLATFORM_BADGE: Record<string, string> = {
  'Nextdoor': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Neighborhood Facebook Group': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Business Facebook': 'bg-blue-500/20 text-blue-300 border-blue-400/30',
  'Business Instagram': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
}

const TYPE_BADGE: Record<string, string> = {
  'Educational Tip': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Seasonal Reminder': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Neighborhood Proof Story': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Community Participation': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'Storm or Event Response': 'bg-red-500/20 text-red-400 border-red-500/30',
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// ─── Monthly Calendar Section ───────────────────────────────────────

function CalendarSection({ clientName, showToast }: { clientName: string; showToast: (msg: string) => void }) {
  const [open, setOpen] = useState(false)
  const [trade, setTrade] = useState('')
  const [serviceArea, setServiceArea] = useState('')
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()])
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [triggers, setTriggers] = useState('')
  const [generating, setGenerating] = useState(false)
  const [posts, setPosts] = useState<CalendarPost[]>([])
  const [rawContent, setRawContent] = useState('')

  const inputCls = 'w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] transition-colors placeholder:text-[#8A8070]/50'

  const generate = async () => {
    if (!trade || !serviceArea) return
    setGenerating(true)
    setPosts([])
    setRawContent('')
    try {
      const res = await fetch('/api/sage/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName || 'the business',
          trade,
          serviceArea,
          month,
          year,
          triggers,
        }),
      })
      const data = await res.json()
      setPosts(data.posts || [])
      setRawContent(data.rawContent || '')
      if (data.posts?.length > 0) showToast(`${data.posts.length} posts generated!`)
    } catch { showToast('Generation failed.') }
    setGenerating(false)
  }

  const copyOne = (text: string) => {
    navigator.clipboard.writeText(text)
    showToast('Copied!')
  }

  const copyAll = () => {
    const allText = posts.map((p) =>
      `[${p.week}] ${p.platform} — ${p.type}\n\n${p.text}\n\n(${p.note})`
    ).join('\n\n─────────────\n\n')
    navigator.clipboard.writeText(allText)
    showToast('All posts copied!')
  }

  return (
    <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl overflow-hidden mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[rgba(193,123,42,0.03)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>📅</span>
          <span className="text-sm font-medium text-[#F2EDE4]">Monthly Community Content Calendar</span>
        </div>
        <span className={`text-[#8A8070] text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="px-6 pb-6 border-t border-[rgba(193,123,42,0.1)]">
          <p className="text-xs text-[#8A8070] mt-4 mb-4">
            Generate a full month of pre-written community content — 8 posts across Nextdoor, Facebook, and Instagram.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-[#8A8070] mb-1.5">Client Name</label>
              <input className={inputCls} value={clientName} readOnly={!!clientName} style={clientName ? { opacity: 0.6 } : {}} />
            </div>
            <div>
              <label className="block text-xs text-[#8A8070] mb-1.5">Trade *</label>
              <input className={inputCls} value={trade} onChange={(e) => setTrade(e.target.value)} placeholder="e.g. plumber, roofer, HVAC" />
            </div>
            <div>
              <label className="block text-xs text-[#8A8070] mb-1.5">Primary Service Area or City *</label>
              <input className={inputCls} value={serviceArea} onChange={(e) => setServiceArea(e.target.value)} placeholder="e.g. Louisville, Southern Indiana" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#8A8070] mb-1.5">Month</label>
                <select className={inputCls} value={month} onChange={(e) => setMonth(e.target.value)}>
                  {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#8A8070] mb-1.5">Year</label>
                <select className={inputCls} value={year} onChange={(e) => setYear(e.target.value)}>
                  {['2025', '2026', '2027'].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs text-[#8A8070] mb-1.5">Any local events or triggers this month? (optional)</label>
            <textarea className={inputCls + ' min-h-[60px]'} value={triggers} onChange={(e) => setTriggers(e.target.value)}
              placeholder="e.g. big storm last week, county fair, back to school season, local sports team in playoffs" />
          </div>

          <button onClick={generate} disabled={generating || !trade || !serviceArea} className="bg-[#C17B2A] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-50">
            {generating ? '📅 Generating Calendar...' : '📅 Generate Calendar'}
          </button>

          {/* Calendar Output */}
          {posts.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-[#F2EDE4]">{month} {year} — {posts.length} Posts</span>
                <button onClick={copyAll} className="text-xs border border-[rgba(193,123,42,0.3)] text-[#C17B2A] px-3 py-1.5 rounded-lg hover:bg-[rgba(193,123,42,0.1)] transition-colors">
                  📋 Copy All
                </button>
              </div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {posts.map((post) => {
                  const platStyle = Object.entries(PLATFORM_BADGE).find(([k]) => post.platform.toLowerCase().includes(k.toLowerCase().split(' ')[0]))?.[1] || 'text-[#8A8070] border-[#8A8070]/30 bg-[#0E0C0A]'
                  const typeStyle = Object.entries(TYPE_BADGE).find(([k]) => post.type.toLowerCase().includes(k.toLowerCase().split(' ')[0]))?.[1] || 'text-[#8A8070] border-[#8A8070]/30 bg-[#0E0C0A]'

                  return (
                    <div key={post.number} className="bg-[#0E0C0A] border border-[rgba(193,123,42,0.1)] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-[#F2EDE4]">{post.week}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${platStyle}`}>{post.platform}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${typeStyle}`}>{post.type}</span>
                        </div>
                        <button onClick={() => copyOne(post.text)} className="text-[10px] text-[#C17B2A] hover:text-[#D4892F] transition-colors shrink-0">
                          📋 Copy
                        </button>
                      </div>
                      <p className="text-sm text-[#F2EDE4] whitespace-pre-line leading-relaxed mb-2">{post.text}</p>
                      {post.note && (
                        <p className="text-[10px] text-[#8A8070] italic border-t border-[rgba(193,123,42,0.1)] pt-2 mt-2">
                          Todd: {post.note}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Storm / Event Response Section ─────────────────────────────────

function StormResponseSection({ clientName, showToast }: { clientName: string; showToast: (msg: string) => void }) {
  const [event, setEvent] = useState('')
  const [trade, setTrade] = useState('')
  const [serviceArea, setServiceArea] = useState('')
  const [generating, setGenerating] = useState(false)
  const [nextdoorPost, setNextdoorPost] = useState('')
  const [facebookPost, setFacebookPost] = useState('')

  const inputCls = 'w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] transition-colors placeholder:text-[#8A8070]/50'

  const generate = async () => {
    if (!event || !trade) return
    setGenerating(true)
    setNextdoorPost('')
    setFacebookPost('')
    try {
      const res = await fetch('/api/sage/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'storm_response',
          clientName: clientName || 'the business',
          trade,
          serviceArea: serviceArea || 'the area',
          event,
        }),
      })
      const data = await res.json()
      setNextdoorPost(data.nextdoorPost || '')
      setFacebookPost(data.facebookPost || '')
      showToast('Response posts generated!')
    } catch { showToast('Generation failed.') }
    setGenerating(false)
  }

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    showToast('Copied!')
  }

  return (
    <div className="bg-[#1E1B16] border border-red-500/20 rounded-2xl p-6 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <span>⚡</span>
        <h2 className="text-sm font-medium text-[#F2EDE4]">Storm or Event Response</h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-medium">Time-Sensitive</span>
      </div>
      <p className="text-xs text-[#8A8070] mb-4">Something happen locally? Generate an immediate community response post.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <input className={inputCls} value={trade} onChange={(e) => setTrade(e.target.value)} placeholder="Trade (e.g. plumber) *" />
        <input className={inputCls} value={serviceArea} onChange={(e) => setServiceArea(e.target.value)} placeholder="Service area (e.g. Louisville)" />
        <input className={inputCls} value={event} onChange={(e) => setEvent(e.target.value)} placeholder="What happened? (e.g. ice storm, power outage) *" />
      </div>

      <button onClick={generate} disabled={generating || !event || !trade} className="bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-red-500 transition-colors disabled:opacity-50">
        {generating ? '⚡ Generating...' : '⚡ Generate Response Post'}
      </button>

      {(nextdoorPost || facebookPost) && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {nextdoorPost && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-[#F2EDE4]">Nextdoor</span>
                <button onClick={() => copy(nextdoorPost)} className="text-[10px] text-[#C17B2A] hover:text-[#D4892F]">📋 Copy</button>
              </div>
              <textarea className={inputCls + ' min-h-[120px] text-sm leading-relaxed'} value={nextdoorPost} onChange={(e) => setNextdoorPost(e.target.value)} />
            </div>
          )}
          {facebookPost && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-[#F2EDE4]">Facebook Group</span>
                <button onClick={() => copy(facebookPost)} className="text-[10px] text-[#C17B2A] hover:text-[#D4892F]">📋 Copy</button>
              </div>
              <textarea className={inputCls + ' min-h-[120px] text-sm leading-relaxed'} value={facebookPost} onChange={(e) => setFacebookPost(e.target.value)} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMMUNITY GROUP MODE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type CgTab = 'builder' | 'rules' | 'templates'

interface GroupRule {
  id: string
  groupName: string
  platform: string
  allowedPostFrequency: string | null
  promoThread: boolean
  bannedBehaviors: string | null
  notes: string | null
}

interface ResponseTemplate {
  id: string
  templateName: string
  platform: string
  templateText: string
}

const POST_TYPES = [
  'Educational Tip',
  'Seasonal Reminder',
  'Before and After Story',
  'Storm or Event Response',
  'Community Participation',
  'Ask for Recommendations',
]

const PRE_POST_CHECKLIST = [
  'Does this sound like a neighbor or like an ad',
  'Is the neighborhood name mentioned naturally',
  'Does it follow this group\'s posting rules',
  'Is there a real photo from this job to attach',
]

function CommunityGroupMode({ clientId, clientName, showToast }: { clientId: string; clientName: string; showToast: (msg: string) => void }) {
  const [activeTab, setActiveTab] = useState<CgTab>('builder')

  const tabs: { key: CgTab; label: string }[] = [
    { key: 'builder', label: 'Group Post Builder' },
    { key: 'rules', label: 'Rules Tracker' },
    { key: 'templates', label: 'Response Templates' },
  ]

  return (
    <div className="mb-6 bg-[#1E1B16] rounded-2xl border border-[#C17B2A]/30 overflow-hidden">
      {/* Accent top line */}
      <div className="h-1 bg-gradient-to-r from-[#C17B2A] via-[#D4892F] to-[#C17B2A]" />

      {/* Header */}
      <div className="px-6 pt-5 pb-0">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-sm">🏘️</span>
          <h2 className="text-base font-medium text-[#F2EDE4]">Community Group Mode</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C17B2A]/20 text-[#C17B2A] border border-[#C17B2A]/30 font-semibold">New</span>
        </div>
        <p className="text-xs text-[#8A8070] mb-4">Nextdoor and Facebook group content that sounds like a neighbor, not a brand.</p>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-[rgba(193,123,42,0.15)]">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-xs font-medium transition-colors relative ${
                activeTab === t.key ? 'text-[#C17B2A]' : 'text-[#8A8070] hover:text-[#F2EDE4]'
              }`}
            >
              {t.label}
              {activeTab === t.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C17B2A] rounded-t" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-6 py-5">
        {activeTab === 'builder' && <BuilderTab clientName={clientName} showToast={showToast} />}
        {activeTab === 'rules' && <RulesTab clientId={clientId} showToast={showToast} />}
        {activeTab === 'templates' && <TemplatesTab clientId={clientId} showToast={showToast} />}
      </div>
    </div>
  )
}

// ─── Tab 1: Group Post Builder ──────────────────────────────────────

function BuilderTab({ clientName, showToast }: { clientName: string; showToast: (msg: string) => void }) {
  const [trade, setTrade] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [postType, setPostType] = useState(POST_TYPES[0])
  const [details, setDetails] = useState('')
  const [tone, setTone] = useState('Nextdoor Neighbor Voice')
  const [generating, setGenerating] = useState(false)
  const [post, setPost] = useState('')

  const inputCls = 'w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] transition-colors placeholder:text-[#8A8070]/50'

  const generate = async () => {
    if (!trade || !neighborhood || !details) return
    setGenerating(true)
    setPost('')
    try {
      const res = await fetch('/api/sage/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_post',
          clientName: clientName || 'the business',
          trade,
          neighborhood,
          postType,
          details,
          tone,
        }),
      })
      const data = await res.json()
      setPost(data.post || '')
      if (data.post) showToast('Post generated!')
    } catch { showToast('Generation failed.') }
    setGenerating(false)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[#8A8070] mb-1.5">Client Name</label>
          <input className={inputCls} value={clientName} readOnly={!!clientName} style={clientName ? { opacity: 0.6 } : {}} />
        </div>
        <div>
          <label className="block text-xs text-[#8A8070] mb-1.5">Trade *</label>
          <input className={inputCls} value={trade} onChange={(e) => setTrade(e.target.value)} placeholder="e.g. plumber, roofer" />
        </div>
        <div>
          <label className="block text-xs text-[#8A8070] mb-1.5">Neighborhood or Group Name *</label>
          <input className={inputCls} value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="e.g. St. Matthews Neighbors" />
        </div>
        <div>
          <label className="block text-xs text-[#8A8070] mb-1.5">Post Type</label>
          <select className={inputCls} value={postType} onChange={(e) => setPostType(e.target.value)}>
            {POST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-[#8A8070] mb-1.5">Specific details or context *</label>
        <textarea className={inputCls + ' min-h-[80px]'} value={details} onChange={(e) => setDetails(e.target.value)}
          placeholder="e.g. Just finished replacing a water heater for a family on Dundee Road — old one was 18 years old and about to fail." />
      </div>

      {/* Tone selector */}
      <div>
        <label className="block text-xs text-[#8A8070] mb-2">Tone</label>
        <div className="flex gap-3">
          {['Nextdoor Neighbor Voice', 'Facebook Group Member Voice'].map((t) => (
            <label key={t} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="cg-tone"
                checked={tone === t}
                onChange={() => setTone(t)}
                className="accent-[#C17B2A]"
              />
              <span className="text-xs text-[#F2EDE4]">{t}</span>
            </label>
          ))}
        </div>
      </div>

      <button onClick={generate} disabled={generating || !trade || !neighborhood || !details}
        className="bg-[#C17B2A] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-50">
        {generating ? '🏘️ Generating...' : '🏘️ Generate Post'}
      </button>

      {/* Output */}
      {post && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8A8070]">Generated post — edit as needed</span>
            <button onClick={() => { navigator.clipboard.writeText(post); showToast('Copied!') }}
              className="text-xs border border-[rgba(193,123,42,0.3)] text-[#C17B2A] px-3 py-1.5 rounded-lg hover:bg-[rgba(193,123,42,0.1)] transition-colors">
              📋 Copy
            </button>
          </div>
          <textarea className={inputCls + ' min-h-[140px] text-sm leading-relaxed'} value={post} onChange={(e) => setPost(e.target.value)} />

          {/* Pre-post checklist */}
          <div className="mt-3 bg-[#0E0C0A] rounded-lg p-3 border border-[rgba(193,123,42,0.1)]">
            <p className="text-[10px] text-[#C17B2A] font-medium mb-2">Before posting, verify:</p>
            {PRE_POST_CHECKLIST.map((item, i) => (
              <label key={i} className="flex items-center gap-2 mb-1 cursor-pointer">
                <input type="checkbox" className="accent-[#C17B2A] w-3 h-3" />
                <span className="text-[11px] text-[#8A8070]">{item}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab 2: Rules Tracker ───────────────────────────────────────────

function RulesTab({ clientId, showToast }: { clientId: string; showToast: (msg: string) => void }) {
  const [rules, setRules] = useState<GroupRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Form
  const [groupName, setGroupName] = useState('')
  const [platform, setPlatform] = useState('Facebook Group')
  const [frequency, setFrequency] = useState('')
  const [promoThread, setPromoThread] = useState(false)
  const [banned, setBanned] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const inputCls = 'w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] transition-colors placeholder:text-[#8A8070]/50'

  const load = useCallback(() => {
    if (!clientId) return
    setLoading(true)
    fetch(`/api/sage/community?clientId=${clientId}&type=rules`)
      .then((r) => r.json())
      .then((data) => setRules(data.rules || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!groupName) return
    setSaving(true)
    try {
      await fetch('/api/sage/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_rules',
          clientId,
          groupName,
          platform,
          allowedPostFrequency: frequency,
          promoThread,
          bannedBehaviors: banned,
          notes,
        }),
      })
      setGroupName(''); setFrequency(''); setPromoThread(false); setBanned(''); setNotes('')
      setShowForm(false)
      showToast('Group saved!')
      load()
    } catch { showToast('Save failed.') }
    setSaving(false)
  }

  const deleteRule = async (id: string) => {
    await fetch('/api/sage/community', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_rules', id }),
    })
    showToast('Removed.')
    load()
  }

  return (
    <div>
      {/* Warning banner */}
      <div className="bg-[#C17B2A]/10 border border-[#C17B2A]/30 rounded-lg px-4 py-3 mb-4">
        <p className="text-xs text-[#C17B2A] font-medium">
          ⚠️ Always check group rules before posting. Getting flagged as spam in a neighborhood group can permanently damage a client&apos;s local reputation.
        </p>
      </div>

      {/* Existing rules */}
      {loading ? (
        <p className="text-xs text-[#8A8070] py-4">Loading...</p>
      ) : rules.length === 0 ? (
        <p className="text-xs text-[#8A8070] py-4">No group rules saved yet. Add a group to track its posting rules.</p>
      ) : (
        <div className="space-y-3 mb-4">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-[#0E0C0A] rounded-lg p-4 border border-[rgba(193,123,42,0.1)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-[#F2EDE4]">{rule.groupName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">{rule.platform}</span>
                  </div>
                  {rule.allowedPostFrequency && (
                    <p className="text-xs text-[#8A8070]">Posting frequency: <span className="text-[#F2EDE4]">{rule.allowedPostFrequency}</span></p>
                  )}
                  <p className="text-xs text-[#8A8070]">
                    Promo thread: <span className="text-[#F2EDE4]">{rule.promoThread ? 'Yes' : 'No'}</span>
                  </p>
                  {rule.bannedBehaviors && (
                    <p className="text-xs text-red-400/80 mt-1">Banned: {rule.bannedBehaviors}</p>
                  )}
                  {rule.notes && (
                    <p className="text-xs text-[#8A8070] mt-1 italic">{rule.notes}</p>
                  )}
                </div>
                <button onClick={() => deleteRule(rule.id)} className="text-[10px] text-[#8A8070] hover:text-red-400 transition-colors">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {!showForm ? (
        <button onClick={() => setShowForm(true)} className="text-xs text-[#C17B2A] hover:text-[#D4892F] transition-colors">+ Add Group</button>
      ) : (
        <div className="bg-[#0E0C0A] rounded-lg p-4 border border-[rgba(193,123,42,0.15)] space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#8A8070] mb-1">Group Name *</label>
              <input className={inputCls} value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. St. Matthews Community" />
            </div>
            <div>
              <label className="block text-xs text-[#8A8070] mb-1">Platform</label>
              <select className={inputCls} value={platform} onChange={(e) => setPlatform(e.target.value)}>
                <option>Facebook Group</option>
                <option>Nextdoor</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#8A8070] mb-1">Allowed Promo Frequency</label>
              <input className={inputCls} value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="e.g. once per week, Fridays only" />
            </div>
            <div>
              <label className="block text-xs text-[#8A8070] mb-1">Dedicated Promo Thread</label>
              <button
                onClick={() => setPromoThread(!promoThread)}
                className={`w-11 h-6 rounded-full transition-colors relative ${promoThread ? 'bg-[#C17B2A]' : 'bg-[#2A2520]'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${promoThread ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#8A8070] mb-1">Banned Behaviors</label>
            <textarea className={inputCls + ' min-h-[50px]'} value={banned} onChange={(e) => setBanned(e.target.value)}
              placeholder="e.g. No direct self-promotion, no links in first post" />
          </div>
          <div>
            <label className="block text-xs text-[#8A8070] mb-1">Notes</label>
            <textarea className={inputCls + ' min-h-[40px]'} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Admin is friendly, approved us to post job stories" />
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving || !groupName} className="bg-[#C17B2A] text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Group'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-xs text-[#8A8070] px-3 py-2 hover:text-[#F2EDE4] transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab 3: Response Templates ──────────────────────────────────────

function TemplatesTab({ clientId, showToast }: { clientId: string; showToast: (msg: string) => void }) {
  const [templates, setTemplates] = useState<ResponseTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  // New template form
  const [newName, setNewName] = useState('')
  const [newPlatform, setNewPlatform] = useState('Any')
  const [newText, setNewText] = useState('')
  const [saving, setSaving] = useState(false)

  const inputCls = 'w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] transition-colors placeholder:text-[#8A8070]/50'

  const load = useCallback(() => {
    if (!clientId) return
    setLoading(true)
    fetch(`/api/sage/community?clientId=${clientId}&type=templates`)
      .then((r) => r.json())
      .then((data) => setTemplates(data.templates || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  useEffect(() => { load() }, [load])

  const startEdit = (t: ResponseTemplate) => {
    setEditingId(t.id)
    setEditText(t.templateText)
  }

  const saveEdit = async () => {
    if (!editingId) return
    await fetch('/api/sage/community', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_template', id: editingId, templateText: editText }),
    })
    setEditingId(null)
    showToast('Template updated!')
    load()
  }

  const addTemplate = async () => {
    if (!newName || !newText) return
    setSaving(true)
    try {
      await fetch('/api/sage/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_template', clientId, templateName: newName, platform: newPlatform, templateText: newText }),
      })
      setNewName(''); setNewText(''); setNewPlatform('Any')
      showToast('Template added!')
      load()
    } catch { showToast('Save failed.') }
    setSaving(false)
  }

  if (loading) return <p className="text-xs text-[#8A8070] py-4">Loading templates...</p>

  return (
    <div>
      <p className="text-xs text-[#8A8070] mb-4">Quick responses for when neighbors tag this client or ask for recommendations.</p>

      {/* Template cards */}
      <div className="space-y-3 mb-6">
        {templates.map((t) => (
          <div key={t.id} className="bg-[#0E0C0A] rounded-lg p-4 border border-[rgba(193,123,42,0.1)]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#F2EDE4]">{t.templateName}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C17B2A]/10 text-[#C17B2A] border border-[#C17B2A]/20">{t.platform}</span>
              </div>
              <div className="flex gap-2">
                {editingId === t.id ? (
                  <button onClick={saveEdit} className="text-[10px] text-green-400 hover:text-green-300">Save</button>
                ) : (
                  <button onClick={() => startEdit(t)} className="text-[10px] text-[#8A8070] hover:text-[#C17B2A]">Edit</button>
                )}
                <button onClick={() => { navigator.clipboard.writeText(t.templateText); showToast('Copied!') }}
                  className="text-[10px] text-[#C17B2A] hover:text-[#D4892F]">📋 Copy</button>
              </div>
            </div>
            {editingId === t.id ? (
              <textarea className={inputCls + ' min-h-[80px] text-xs leading-relaxed'} value={editText} onChange={(e) => setEditText(e.target.value)} />
            ) : (
              <p className="text-xs text-[#8A8070] leading-relaxed whitespace-pre-line">{t.templateText}</p>
            )}
          </div>
        ))}
      </div>

      {/* Add new template */}
      <div className="bg-[#0E0C0A] rounded-lg p-4 border border-[rgba(193,123,42,0.1)] space-y-3">
        <p className="text-xs font-medium text-[#8A8070]">Add Custom Template</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#8A8070] mb-1">Template Name *</label>
            <input className={inputCls} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Thank You Response" />
          </div>
          <div>
            <label className="block text-xs text-[#8A8070] mb-1">Platform</label>
            <select className={inputCls} value={newPlatform} onChange={(e) => setNewPlatform(e.target.value)}>
              <option>Any</option>
              <option>Nextdoor</option>
              <option>Facebook Group</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-[#8A8070] mb-1">Template Text *</label>
          <textarea className={inputCls + ' min-h-[80px]'} value={newText} onChange={(e) => setNewText(e.target.value)}
            placeholder="Use [brackets] for placeholders like [neighbor name], [phone], [neighborhood]..." />
        </div>
        <button onClick={addTemplate} disabled={saving || !newName || !newText}
          className="bg-[#C17B2A] text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : 'Add Template'}
        </button>
      </div>
    </div>
  )
}
