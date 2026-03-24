'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Insight {
  id: string
  clientId: string
  category: string
  insight: string
  confidence: string
  dataPoints: number
  firstObserved: string
  lastConfirmed: string
  source: string
  actionTaken: string | null
  isBenchmark: boolean
  tradeVertical: string | null
}

interface AgentClientOption {
  id: string
  businessName: string
  industry: string
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

const CATEGORY_EMOJIS: Record<string, string> = {
  revenue: '💰',
  operations: '⚙️',
  reputation: '⭐',
  'customer-behavior': '👥',
  pricing: '🏷️',
  fleet: '🚗',
  scheduling: '📅',
  marketing: '📣',
  benchmark: '📊',
  collections: '💵',
  inventory: '📦',
}

export default function MemoriaPage() {
  const [clients, setClients] = useState<AgentClientOption[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [reportSummary, setReportSummary] = useState<string>('')
  const [reportLoading, setReportLoading] = useState(false)

  useEffect(() => {
    fetch('/api/agent-clients')
      .then((r) => r.json())
      .then((data) => setClients(data.clients || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedClient) {
      setInsights([])
      setReportSummary('')
      return
    }
    setLoading(true)
    const params = new URLSearchParams({ clientId: selectedClient })
    if (categoryFilter) params.set('category', categoryFilter)
    fetch(`/api/memoria/insights?${params}`)
      .then((r) => r.json())
      .then((data) => setInsights(data.insights || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedClient, categoryFilter])

  const generateReport = async () => {
    if (!selectedClient) return
    setReportLoading(true)
    try {
      const res = await fetch('/api/memoria/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClient }),
      })
      const data = await res.json()
      setReportSummary(data.summary || 'No data available.')
    } catch {
      setReportSummary('Failed to generate report.')
    } finally {
      setReportLoading(false)
    }
  }

  const categories = [...new Set(insights.map((i) => i.category))]

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="text-[#8A8070] text-sm hover:text-[#C17B2A] transition-colors mb-2 inline-block">&larr; Dashboard</Link>
            <h1 className="text-2xl font-semibold text-[#F2EDE4] flex items-center gap-2">
              <span>🧠</span> Memoria Intelligence
            </h1>
            <p className="text-sm text-[#8A8070]">Shared client intelligence across all agents</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-8">
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="bg-[#1E1B16] border border-[rgba(193,123,42,0.3)] text-[#F2EDE4] px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#C17B2A]"
          >
            <option value="">Select a client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.businessName} — {c.industry}</option>
            ))}
          </select>

          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[#1E1B16] border border-[rgba(193,123,42,0.3)] text-[#F2EDE4] px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#C17B2A]"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_EMOJIS[cat] || '📌'} {cat}</option>
              ))}
            </select>
          )}

          {selectedClient && (
            <button
              onClick={generateReport}
              disabled={reportLoading}
              className="bg-[#C17B2A] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-50"
            >
              {reportLoading ? 'Generating...' : '📋 Generate Report'}
            </button>
          )}
        </div>

        {/* Stats Bar */}
        {selectedClient && insights.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
              <div className="text-2xl font-semibold text-[#C17B2A]">{insights.length}</div>
              <div className="text-xs text-[#8A8070] mt-1">Total Insights</div>
            </div>
            <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
              <div className="text-2xl font-semibold text-green-400">{insights.filter((i) => i.confidence === 'high').length}</div>
              <div className="text-xs text-[#8A8070] mt-1">High Confidence</div>
            </div>
            <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
              <div className="text-2xl font-semibold text-[#C17B2A]">{categories.length}</div>
              <div className="text-xs text-[#8A8070] mt-1">Categories</div>
            </div>
            <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
              <div className="text-2xl font-semibold text-blue-400">{insights.filter((i) => i.isBenchmark).length}</div>
              <div className="text-xs text-[#8A8070] mt-1">Benchmarks</div>
            </div>
          </div>
        )}

        {/* Report */}
        {reportSummary && (
          <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.3)] p-6 mb-8">
            <h2 className="text-sm font-medium text-[#C17B2A] mb-3">Intelligence Report</h2>
            <pre className="text-xs text-[#F2EDE4] whitespace-pre-wrap font-mono leading-relaxed">{reportSummary}</pre>
          </div>
        )}

        {/* Insights List */}
        {loading ? (
          <div className="text-center text-[#8A8070] py-20">Loading insights...</div>
        ) : !selectedClient ? (
          <div className="text-center py-20">
            <p className="text-[#8A8070] text-lg mb-2">🧠</p>
            <p className="text-[#8A8070]">Select a client to view their intelligence profile</p>
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#8A8070]">No insights recorded yet for this client.</p>
            <p className="text-xs text-[#8A8070] mt-2">Insights are gathered automatically as agents interact with this client.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((ins) => (
              <div
                key={ins.id}
                className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4 hover:border-[rgba(193,123,42,0.3)] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm">{CATEGORY_EMOJIS[ins.category] || '📌'}</span>
                      <span className="text-xs text-[#8A8070] uppercase tracking-wide">{ins.category}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${CONFIDENCE_COLORS[ins.confidence]}`}>
                        {ins.confidence}
                      </span>
                      {ins.isBenchmark && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium">
                          benchmark
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#F2EDE4] leading-relaxed">{ins.insight}</p>
                    {ins.actionTaken && (
                      <p className="text-xs text-[#C17B2A] mt-1">Action: {ins.actionTaken}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-[#8A8070]">{ins.dataPoints} obs.</div>
                    <div className="text-[10px] text-[#8A8070] mt-0.5">via {ins.source}</div>
                    {ins.tradeVertical && (
                      <div className="text-[10px] text-[#C17B2A] mt-0.5">{ins.tradeVertical}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
