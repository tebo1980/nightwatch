'use client'

import { useEffect, useState } from 'react'
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
