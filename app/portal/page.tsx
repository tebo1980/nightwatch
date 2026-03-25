'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

// ─── Types ──────────────────────────────────────────────────────────

interface PortalClient {
  id: string
  businessName: string
  ownerName: string
  ownerFirstName: string
  industry: string
  city: string
  state: string
  tier: string
  novaEnabled: boolean
  rexEnabled: boolean
  irisEnabled: boolean
  maxEnabled: boolean
  dellaEnabled: boolean
  flynnEnabled: boolean
  coleEnabled: boolean
  riverEnabled: boolean
  sageEnabled: boolean
  atlasEnabled: boolean
  memoriaEnabled: boolean
}

interface AgentCard {
  key: string
  toggleField: keyof PortalClient
  name: string
  emoji: string
  role: string
  href: string | null
  isNova?: boolean
}

const AGENTS: AgentCard[] = [
  { key: 'nova', toggleField: 'novaEnabled', name: 'Nova', emoji: '💬', role: 'Website Agent', href: null, isNova: true },
  { key: 'rex', toggleField: 'rexEnabled', name: 'Rex', emoji: '🦖', role: 'Review Manager', href: '/rex' },
  { key: 'iris', toggleField: 'irisEnabled', name: 'Iris', emoji: '🌺', role: 'Follow-Up Agent', href: '/iris' },
  { key: 'max', toggleField: 'maxEnabled', name: 'Max', emoji: '💪', role: 'Back Office Agent', href: '/max' },
  { key: 'della', toggleField: 'dellaEnabled', name: 'Della', emoji: '✉️', role: 'Email Secretary', href: '/della' },
  { key: 'sage', toggleField: 'sageEnabled', name: 'Sage', emoji: '🌿', role: 'Social Media Agent', href: '/sage' },
  { key: 'flynn', toggleField: 'flynnEnabled', name: 'Flynn', emoji: '🚗', role: 'Fleet Agent', href: '/flynn' },
  { key: 'cole', toggleField: 'coleEnabled', name: 'Cole', emoji: '📊', role: 'Cost Intelligence Agent', href: '/cole' },
  { key: 'river', toggleField: 'riverEnabled', name: 'River', emoji: '🌊', role: 'Appointment Agent', href: '/river' },
  { key: 'atlas', toggleField: 'atlasEnabled', name: 'Atlas', emoji: '🗺️', role: 'Material Intelligence Agent', href: '/atlas' },
  { key: 'memoria', toggleField: 'memoriaEnabled', name: 'Memoria', emoji: '🧠', role: 'Business Intelligence', href: '/memoria' },
]

// ─── Portal Content (needs search params) ───────────────────────────

function PortalContent() {
  const searchParams = useSearchParams()
  const clientId = searchParams.get('clientId')

  const [client, setClient] = useState<PortalClient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!clientId) {
      setLoading(false)
      return
    }
    fetch(`/api/portal?clientId=${clientId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(true)
        else setClient(data.client)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [clientId])

  // No clientId provided
  if (!clientId) {
    return (
      <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <Logo />
          <p className="text-[#8A8070] text-sm mt-6 leading-relaxed">
            Please use the link provided by BaraTrust to access your portal.
          </p>
          <p className="text-[#8A8070]/60 text-xs mt-4">
            Questions? Contact Todd at 502-431-3285
          </p>
        </div>
      </div>
    )
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center">
        <div className="text-center">
          <Logo />
          <p className="text-[#8A8070] text-sm mt-6">Loading your portal...</p>
        </div>
      </div>
    )
  }

  // Error or not found
  if (error || !client) {
    return (
      <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <Logo />
          <p className="text-[#8A8070] text-sm mt-6 leading-relaxed">
            We couldn&apos;t find your portal. Please check the link you were given or contact BaraTrust for assistance.
          </p>
          <p className="text-[#8A8070]/60 text-xs mt-4">
            Questions? Text or call Todd at 502-431-3285
          </p>
        </div>
      </div>
    )
  }

  // Active agents for this client
  const activeAgents = AGENTS.filter((a) => client[a.toggleField])

  return (
    <div className="min-h-screen bg-[#0E0C0A] flex flex-col">
      <div className="flex-1 p-6 md:p-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10 pt-6">
            <Logo />
            <p className="text-[#8A8070] text-sm mt-4">Welcome to your BaraTrust AI Staff portal</p>
            <h2 className="text-xl md:text-2xl font-semibold text-[#F2EDE4] mt-1">{client.businessName}</h2>
          </div>

          {/* Agent Grid */}
          {activeAgents.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[#8A8070]">No agents are active for your account yet.</p>
              <p className="text-xs text-[#8A8070]/60 mt-2">Contact Todd to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
              {activeAgents.map((agent) => (
                <AgentCardComponent key={agent.key} agent={agent} />
              ))}
            </div>
          )}

          {/* Support line */}
          <div className="text-center mb-8">
            <p className="text-xs text-[#8A8070]/70 leading-relaxed">
              Questions? Text or call Todd directly at{' '}
              <a href="tel:5024313285" className="text-[#C17B2A] hover:underline">502-431-3285</a>
              {' '}or email{' '}
              <a href="mailto:todd@baratrust.com" className="text-[#C17B2A] hover:underline">todd@baratrust.com</a>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-sm text-[#8A8070]/50 italic" style={{ fontFamily: "var(--font-cormorant), 'Georgia', serif" }}>
          Peace of mind. Revenue. Trust.
        </p>
      </footer>
    </div>
  )
}

// ─── Logo Component ─────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center justify-center gap-2.5">
      <span className="text-3xl">🦫</span>
      <span
        className="text-2xl font-semibold text-[#F2EDE4] tracking-wide"
        style={{ fontFamily: "var(--font-cormorant), 'Georgia', serif" }}
      >
        BaraTrust
      </span>
    </div>
  )
}

// ─── Agent Card Component ───────────────────────────────────────────

function AgentCardComponent({ agent }: { agent: AgentCard }) {
  if (agent.isNova) {
    return (
      <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-5 flex flex-col">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-[#C17B2A]/10 flex items-center justify-center text-xl">
            {agent.emoji}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#F2EDE4]">{agent.name}</h3>
            <p className="text-xs text-[#8A8070]">{agent.role}</p>
          </div>
        </div>
        <p className="text-xs text-[#8A8070] leading-relaxed flex-1">
          Nova is already live on your website — she handles inquiries 24/7.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[11px] text-green-400 font-medium">Active</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-5 flex flex-col hover:border-[rgba(193,123,42,0.35)] transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-[#C17B2A]/10 flex items-center justify-center text-xl">
          {agent.emoji}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#F2EDE4]">{agent.name}</h3>
          <p className="text-xs text-[#8A8070]">{agent.role}</p>
        </div>
      </div>
      <div className="flex-1" />
      {agent.href && (
        <a
          href={agent.href}
          className="mt-3 block text-center bg-[#C17B2A] text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-[#D4892F] transition-colors"
        >
          Open {agent.name}
        </a>
      )}
    </div>
  )
}

// ─── Exported Page (wrapped in Suspense for useSearchParams) ────────

export default function PortalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center">
        <p className="text-[#8A8070] text-sm">Loading...</p>
      </div>
    }>
      <PortalContent />
    </Suspense>
  )
}
