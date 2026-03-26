'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const AGENTS = [
  { key: 'nova', name: 'Nova', field: 'novaEnabled' },
  { key: 'rex', name: 'Rex', field: 'rexEnabled' },
  { key: 'iris', name: 'Iris', field: 'irisEnabled' },
  { key: 'max', name: 'Max', field: 'maxEnabled' },
  { key: 'della', name: 'Della', field: 'dellaEnabled' },
  { key: 'sage', name: 'Sage', field: 'sageEnabled' },
  { key: 'flynn', name: 'Flynn', field: 'flynnEnabled' },
  { key: 'cole', name: 'Cole', field: 'coleEnabled' },
  { key: 'river', name: 'River', field: 'riverEnabled' },
  { key: 'atlas', name: 'Atlas', field: 'atlasEnabled' },
  { key: 'bolt', name: 'Bolt', field: '' },
  { key: 'memoria', name: 'Memoria', field: 'memoriaEnabled' },
]

const TIERS = ['Starter', 'Complete', 'Complete+', 'Agents Only']

const SEND_CHECKLIST = [
  'Portal link tested and working',
  'All active agents confirmed in Nightwatch',
  'CallRail number assigned and active',
  'Calendly link working',
]

const inputCls = 'w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] transition-colors placeholder:text-[#8A8070]/50'
const btnPrimary = 'bg-[#C17B2A] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-50'
const btnCopy = 'text-xs border border-[rgba(193,123,42,0.3)] text-[#C17B2A] px-3 py-1.5 rounded-lg hover:bg-[rgba(193,123,42,0.1)] transition-colors'

function WelcomeEmailContent() {
  const searchParams = useSearchParams()
  const clientId = searchParams.get('clientId')

  const [clientName, setClientName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [trade, setTrade] = useState('')
  const [tier, setTier] = useState('Complete')
  const [portalLink, setPortalLink] = useState('')
  const [calendlyLink, setCalendlyLink] = useState('https://calendly.com/tebo1980/baratrust-consultation')
  const [activeAgents, setActiveAgents] = useState<string[]>([])

  const [generating, setGenerating] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2000) }

  // Load client data if clientId provided
  useEffect(() => {
    if (!clientId) return
    setPortalLink(`https://nightwatch.baratrust.com/portal?clientId=${clientId}`)
    fetch(`/api/portal?clientId=${clientId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.client) return
        const c = data.client
        setClientName(c.ownerFirstName || c.ownerName?.split(' ')[0] || '')
        setBusinessName(c.businessName || '')
        setTrade(c.industry || '')

        const enabled: string[] = []
        for (const agent of AGENTS) {
          if (agent.field && c[agent.field]) enabled.push(agent.name)
        }
        setActiveAgents(enabled)
      })
      .catch(() => {})
  }, [clientId])

  const toggleAgent = (name: string) => {
    setActiveAgents((prev) => prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name])
  }

  const generate = async () => {
    if (!clientName || !businessName || !trade) return
    setGenerating(true)
    setSubject('')
    setBody('')
    try {
      const res = await fetch('/api/welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName, businessName, trade, tier, portalLink, calendlyLink, activeAgents }),
      })
      const data = await res.json()
      const fullText = data.fullText || ''

      // Parse subject from first line
      const lines = fullText.split('\n')
      let subjectLine = ''
      let bodyStart = 0
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().toUpperCase().startsWith('SUBJECT:')) {
          subjectLine = lines[i].trim().replace(/^SUBJECT:\s*/i, '')
          bodyStart = i + 1
          // Skip blank line after subject
          if (bodyStart < lines.length && lines[bodyStart].trim() === '') bodyStart++
          break
        }
      }

      setSubject(subjectLine)
      setBody(lines.slice(bodyStart).join('\n').trim())
      if (fullText) showToast('Email generated!')
    } catch { showToast('Generation failed.') }
    setGenerating(false)
  }

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        {toast && <div className="fixed top-6 right-6 bg-[#1E1B16] border border-[#C17B2A]/30 text-[#F2EDE4] text-sm px-5 py-3 rounded-lg shadow-lg z-50">{toast}</div>}

        {/* Header */}
        <div className="mb-6">
          <Link href="/" className="text-[#8A8070] text-sm hover:text-[#C17B2A] transition-colors mb-2 inline-block">&larr; Dashboard</Link>
          <h1 className="text-2xl font-semibold text-[#F2EDE4] flex items-center gap-2">
            <span>✉️</span> Welcome Email Generator
          </h1>
          <p className="text-sm text-[#8A8070]">Generate a personalized welcome email for new BaraTrust clients</p>
        </div>

        {/* Form */}
        <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-[#8A8070] mb-1.5">Client First Name *</label>
              <input className={inputCls} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="John" />
            </div>
            <div>
              <label className="block text-xs text-[#8A8070] mb-1.5">Business Name *</label>
              <input className={inputCls} value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Smith Plumbing" />
            </div>
            <div>
              <label className="block text-xs text-[#8A8070] mb-1.5">Trade *</label>
              <input className={inputCls} value={trade} onChange={(e) => setTrade(e.target.value)} placeholder="plumber, roofer, HVAC" />
            </div>
            <div>
              <label className="block text-xs text-[#8A8070] mb-1.5">Subscription Tier</label>
              <select className={inputCls} value={tier} onChange={(e) => setTier(e.target.value)}>
                {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#8A8070] mb-1.5">Portal Link</label>
              <input className={inputCls} value={portalLink} onChange={(e) => setPortalLink(e.target.value)} placeholder="nightwatch.baratrust.com/portal?clientId=..." />
            </div>
            <div>
              <label className="block text-xs text-[#8A8070] mb-1.5">Calendly Link</label>
              <input className={inputCls} value={calendlyLink} onChange={(e) => setCalendlyLink(e.target.value)} />
            </div>
          </div>

          {/* Agent checkboxes */}
          <div className="mb-5">
            <label className="block text-xs text-[#8A8070] mb-2">Active Agents</label>
            <div className="flex flex-wrap gap-2">
              {AGENTS.map((a) => (
                <button
                  key={a.key}
                  onClick={() => toggleAgent(a.name)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    activeAgents.includes(a.name)
                      ? 'bg-[#C17B2A]/20 text-[#C17B2A] border-[#C17B2A]/40'
                      : 'bg-[#0E0C0A] text-[#8A8070] border-[rgba(193,123,42,0.15)] hover:border-[rgba(193,123,42,0.3)]'
                  }`}
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>

          <button onClick={generate} disabled={generating || !clientName || !businessName || !trade} className={btnPrimary}>
            {generating ? '✉️ Generating...' : '✉️ Generate Welcome Email'}
          </button>
        </div>

        {/* Output */}
        {(subject || body) && (
          <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-6 mb-6">
            {/* Subject */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-[#8A8070]">Subject Line</label>
                <button onClick={() => { navigator.clipboard.writeText(subject); showToast('Subject copied!') }} className={btnCopy}>📋 Copy Subject</button>
              </div>
              <input className={inputCls + ' font-medium'} value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>

            {/* Body */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-[#8A8070]">Email Body</label>
                <button onClick={() => { navigator.clipboard.writeText(body); showToast('Email copied!') }} className={btnCopy}>📋 Copy Email</button>
              </div>
              <textarea className={inputCls + ' min-h-[300px] text-sm leading-relaxed'} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
          </div>
        )}

        {/* Send Checklist */}
        {(subject || body) && (
          <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-6">
            <h3 className="text-xs font-medium text-[#C17B2A] uppercase tracking-wider mb-3">Send Checklist</h3>
            <div className="space-y-2">
              {SEND_CHECKLIST.map((item, i) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 rounded accent-[#C17B2A]" />
                  <span className="text-sm text-[#F2EDE4] group-hover:text-[#C17B2A] transition-colors">{item}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function WelcomeEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center"><p className="text-[#8A8070]">Loading...</p></div>}>
      <WelcomeEmailContent />
    </Suspense>
  )
}
