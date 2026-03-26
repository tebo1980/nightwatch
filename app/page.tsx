'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface AgentClientCard {
  id: string
  businessName: string
  ownerName: string
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
  createdAt: string
}

const AGENT_DOTS: { key: keyof AgentClientCard; name: string; color: string }[] = [
  { key: 'novaEnabled', name: 'Nova', color: 'bg-blue-400' },
  { key: 'rexEnabled', name: 'Rex', color: 'bg-orange-400' },
  { key: 'irisEnabled', name: 'Iris', color: 'bg-purple-400' },
  { key: 'maxEnabled', name: 'Max', color: 'bg-green-400' },
  { key: 'dellaEnabled', name: 'Della', color: 'bg-pink-400' },
  { key: 'flynnEnabled', name: 'Flynn', color: 'bg-cyan-400' },
  { key: 'coleEnabled', name: 'Cole', color: 'bg-yellow-400' },
  { key: 'riverEnabled', name: 'River', color: 'bg-teal-400' },
  { key: 'sageEnabled', name: 'Sage', color: 'bg-indigo-400' },
  { key: 'atlasEnabled', name: 'Atlas', color: 'bg-red-400' },
]

const TIER_LABELS: Record<string, string> = {
  starter: 'Starter',
  complete: 'Complete',
  complete_plus: 'Complete+',
  agents_only: 'Agents Only',
  restaurant: 'Restaurant',
  medical: 'Medical',
  custom: 'Custom',
}

export default function Dashboard() {
  const [clients, setClients] = useState<AgentClientCard[]>([])
  const [loading, setLoading] = useState(true)
  const [boltStats, setBoltStats] = useState({ configs: 0, estimatesThisMonth: 0, totalValue: 0 })
  const [memoriaStats, setMemoriaStats] = useState({ count: 0, mrr: 0 })

  useEffect(() => {
    fetch('/api/agent-clients')
      .then((r) => r.json())
      .then((data) => setClients(data.clients || []))
      .catch(() => {})
      .finally(() => setLoading(false))
    // Load Bolt stats
    fetch('/api/bolt/config')
      .then((r) => r.json())
      .then((data) => {
        const configs = data.configs || []
        setBoltStats((s) => ({ ...s, configs: configs.length }))
        if (configs.length > 0) {
          const now = new Date()
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
          Promise.all(configs.map((c: { clientId: string }) => fetch(`/api/bolt/estimates?clientId=${c.clientId}`).then((r) => r.json())))
            .then((results) => {
              const allEsts = results.flatMap((r: { estimates?: { sentAt: string; totalAmount: number }[] }) => r.estimates || [])
              const thisMonth = allEsts.filter((e: { sentAt: string }) => e.sentAt && e.sentAt >= monthStart)
              setBoltStats({ configs: configs.length, estimatesThisMonth: thisMonth.length, totalValue: thisMonth.reduce((s: number, e: { totalAmount: number }) => s + e.totalAmount, 0) })
            })
        }
      })
      .catch(() => {})
    // Load Memoria standalone stats
    fetch('/api/memoria/standalone')
      .then((r) => r.json())
      .then((data) => {
        const count = (data.clients || []).length
        setMemoriaStats({ count, mrr: count * 249 })
      })
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-[#F2EDE4]">BaraTrust AI Staff</h1>
            <p className="text-sm text-[#8A8070]">Client Management Dashboard</p>
          </div>
          <Link href="/onboarding" className="bg-[#C17B2A] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors flex items-center gap-2">
            <span className="text-lg leading-none">+</span> Add New Client
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
            <div className="text-2xl font-semibold text-[#C17B2A]">{clients.length}</div>
            <div className="text-xs text-[#8A8070] mt-1">Active Clients</div>
          </div>
          {(['Rex', 'Iris', 'Max', 'Della', 'Sage', 'Flynn', 'Cole', 'River'] as const).map((name) => {
            const key = (name.toLowerCase() + 'Enabled') as keyof AgentClientCard
            const count = clients.filter((c) => c[key]).length
            return (
              <div key={name} className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
                <div className="text-2xl font-semibold text-[#C17B2A]">{count}</div>
                <div className="text-xs text-[#8A8070] mt-1">{name} Active</div>
              </div>
            )
          })}
        </div>

        {/* Bolt Stats */}
        {boltStats.configs > 0 && (
          <Link href="/bolt" className="block bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4 mb-8 hover:border-[rgba(193,123,42,0.4)] transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-xl">&#9889;</span>
                <div>
                  <div className="text-sm font-medium text-[#F2EDE4]">Bolt Estimates</div>
                  <div className="text-xs text-[#8A8070]">{boltStats.configs} client{boltStats.configs !== 1 ? 's' : ''} configured</div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-lg font-semibold text-[#C17B2A]">{boltStats.estimatesThisMonth}</div>
                  <div className="text-[10px] text-[#8A8070]">This Month</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-[#C17B2A]">${boltStats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                  <div className="text-[10px] text-[#8A8070]">Total Value</div>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Memoria Standalone */}
        <Link href="/memoria" className="block bg-[#1E1B16] rounded-xl border border-[rgba(124,58,237,0.15)] p-4 mb-8 hover:border-[rgba(124,58,237,0.4)] transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-xl">🧠</span>
              <div>
                <div className="text-sm font-medium text-[#F2EDE4]">Memoria Standalone</div>
                <div className="text-xs text-[#8A8070]">Business intelligence — $249/mo · One-time intake: $299</div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-lg font-semibold text-purple-400">{memoriaStats.count}</div>
                <div className="text-[10px] text-[#8A8070]">Active Clients</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-purple-400">${memoriaStats.mrr.toLocaleString()}</div>
                <div className="text-[10px] text-[#8A8070]">Monthly Recurring</div>
              </div>
            </div>
          </div>
        </Link>

        {/* Agent Dashboard Links */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { name: 'Rex', href: '/rex', emoji: '🦖' },
            { name: 'Iris', href: '/iris', emoji: '🌺' },
            { name: 'Max', href: '/max', emoji: '💪' },
            { name: 'Della', href: '/della', emoji: '✉️' },
            { name: 'Sage', href: '/sage', emoji: '🌿' },
            { name: 'Flynn', href: '/flynn', emoji: '🚗' },
            { name: 'Cole', href: '/cole', emoji: '📊' },
            { name: 'River', href: '/river', emoji: '🌊' },
            { name: 'Atlas', href: '/atlas', emoji: '🗺️' },
            { name: 'Bolt', href: '/bolt', emoji: '⚡' },
            { name: 'Memoria', href: '/memoria', emoji: '🧠' },
            { name: 'GBP', href: '/gbp', emoji: '📍' },
            { name: 'Scraper', href: '/scraper', emoji: '🕷️' },
            { name: 'Report Generator', href: '/report-generator', emoji: '📝' },
            { name: 'Welcome Email', href: '/welcome-email', emoji: '✉️' },
            { name: 'Competitors', href: '/competitors', emoji: '🎯' },
          ].map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="border border-[rgba(193,123,42,0.3)] text-[#C17B2A] px-4 py-2 rounded-lg text-sm hover:bg-[rgba(193,123,42,0.1)] transition-colors"
            >
              {link.emoji} {link.name}
            </Link>
          ))}
        </div>

        {/* Client Cards */}
        {loading ? (
          <div className="text-center text-[#8A8070] py-20">Loading...</div>
        ) : clients.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#8A8070] mb-4">No clients yet</p>
            <Link href="/onboarding" className="bg-[#C17B2A] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors">
              Onboard Your First Client
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-5 hover:border-[rgba(193,123,42,0.4)] transition-colors block"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-medium text-[#F2EDE4]">{client.businessName}</h3>
                    <p className="text-xs text-[#8A8070] mt-0.5">{client.industry} &middot; {client.city}, {client.state}</p>
                  </div>
                  <span className="text-[10px] bg-[#C17B2A]/20 text-[#C17B2A] px-2 py-0.5 rounded-full font-medium">
                    {TIER_LABELS[client.tier] || client.tier}
                  </span>
                </div>

                <p className="text-xs text-[#8A8070] mb-2">{client.ownerName}</p>

                {/* Agent Dots */}
                <div className="flex flex-wrap gap-1.5">
                  {AGENT_DOTS.filter((a) => client[a.key]).map((a) => (
                    <span key={a.key} className="flex items-center gap-1 text-[10px] text-[#8A8070]">
                      <span className={`w-2 h-2 rounded-full ${a.color}`} />
                      {a.name}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
