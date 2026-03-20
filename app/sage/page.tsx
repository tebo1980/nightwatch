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
