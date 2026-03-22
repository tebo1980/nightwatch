'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface MaterialPrice {
  id: string
  name: string
  trade: string
  unit: string
  currentPrice: number | null
  previousPrice: number | null
  percentChange: number | null
  lowPrice: number | null
  highPrice: number | null
  hdPrice: number | null
  lowesPrice: number | null
  menardsPrice: number | null
  supplyHousePrice: number | null
  sherwinWilliamsPrice: number | null
  amazonPrice: number | null
  walmartPrice: number | null
  targetPrice: number | null
  primarySource: string | null
  category: string | null
  updatedAt: string
  alerts: { id: string; percentChange: number; sourceStore: string | null; createdAt: string }[]
}

// Trades that get each store
const MENARDS_TRADES = ['General Contractor', 'Deck Builder', 'Painter', 'Handyman', 'Concrete']
const SUPPLY_HOUSE_TRADES = ['Plumber', 'HVAC']
const SW_TRADES = ['Painter']
const AMAZON_TRADES = ['Handyman']
const WALMART_TRADES = ['Handyman', 'Painter']
const TARGET_TRADES = ['Handyman', 'Painter']

function isApplicable(store: string, trade: string): boolean {
  switch (store) {
    case 'Menards': return MENARDS_TRADES.includes(trade)
    case 'SupplyHouse': return SUPPLY_HOUSE_TRADES.includes(trade)
    case 'SherwinWilliams': return SW_TRADES.includes(trade)
    case 'Amazon': return AMAZON_TRADES.includes(trade)
    case 'Walmart': return WALMART_TRADES.includes(trade)
    case 'Target': return TARGET_TRADES.includes(trade)
    default: return true // HD and Lowes apply to all
  }
}

const fmt = (n: number | null) => n !== null ? `$${n.toFixed(2)}` : null

export default function AtlasPage() {
  const [materials, setMaterials] = useState<MaterialPrice[]>([])
  const [trades, setTrades] = useState<string[]>([])
  const [selectedTrade, setSelectedTrade] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<MaterialPrice | null>(null)
  const [scraping, setScraping] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams()
    if (selectedTrade) params.set('trade', selectedTrade)
    const res = await fetch(`/api/atlas?${params}`)
    const data = await res.json()
    setMaterials(data.materials || [])
    setTrades(data.trades || [])
    setLoading(false)
  }, [selectedTrade])

  useEffect(() => { fetchData() }, [fetchData])

  const scrapeAllSources = async (materialId: string) => {
    setScraping(true)
    try {
      const res = await fetch('/api/scraper/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(`Scraped ${data.summary.succeeded} sources, ${data.summary.failed} failed`)
        fetchData()
        // Refresh the selected material
        const updatedRes = await fetch(`/api/atlas?trade=${selected?.trade || ''}`)
        const updatedData = await updatedRes.json()
        const updatedMat = (updatedData.materials || []).find((m: MaterialPrice) => m.id === materialId)
        if (updatedMat) setSelected(updatedMat)
      } else {
        showToast('Scrape failed')
      }
    } catch { showToast('Error') } finally { setScraping(false) }
  }

  const formatDate = (d: string) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

  const alertCount = materials.reduce((sum, m) => sum + m.alerts.length, 0)

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        {toast && <div className="fixed top-6 right-6 bg-[#1E1B16] border border-[#C17B2A]/30 text-[#F2EDE4] text-sm px-5 py-3 rounded-lg shadow-lg z-50">{toast}</div>}

        <div className="mb-8">
          <Link href="/" className="text-xs text-[#8A8070] hover:text-[#C17B2A] transition-colors">&larr; Dashboard</Link>
          <h1 className="text-2xl font-semibold text-[#C17B2A] mt-1">Atlas — Material Pricing</h1>
          <p className="text-sm text-[#8A8070]">Multi-source price intelligence for all trades</p>
        </div>

        {/* Alert Banner */}
        {alertCount > 0 && (
          <div className="bg-red-400/10 border border-red-400/30 rounded-xl p-4 mb-6">
            <p className="text-sm text-red-400 font-medium">⚠ {alertCount} price alert{alertCount !== 1 ? 's' : ''} — materials with &gt;10% price changes</p>
          </div>
        )}

        {/* Trade Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button onClick={() => setSelectedTrade('')} className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${!selectedTrade ? 'bg-[#C17B2A] text-white' : 'text-[#8A8070] hover:text-[#F2EDE4]'}`}>
            All Trades
          </button>
          {trades.map((t) => (
            <button key={t} onClick={() => setSelectedTrade(t)} className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${selectedTrade === t ? 'bg-[#C17B2A] text-white' : 'text-[#8A8070] hover:text-[#F2EDE4]'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Material Table */}
          <div className={`flex-1 min-w-0 ${selected ? 'hidden md:block' : ''}`}>
            {loading ? (
              <div className="text-center text-[#8A8070] py-20">Loading...</div>
            ) : materials.length === 0 ? (
              <div className="text-center text-[#8A8070] py-20">No materials found. Run the Atlas seed script to populate.</div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_80px_80px_80px_60px] gap-2 px-4 py-2 text-[10px] text-[#8A8070] uppercase tracking-wider">
                  <span>Material</span>
                  <span className="text-right">Price</span>
                  <span className="text-right">Range</span>
                  <span className="text-right">Change</span>
                  <span className="text-right">Alert</span>
                </div>
                {materials.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelected(m)}
                    className={`w-full text-left grid grid-cols-[1fr_80px_80px_80px_60px] gap-2 px-4 py-3 rounded-xl transition-colors ${
                      selected?.id === m.id ? 'bg-[#C17B2A]/20 border border-[#C17B2A]/40' : 'bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] hover:border-[rgba(193,123,42,0.3)]'
                    }`}
                  >
                    <div>
                      <p className="text-sm text-[#F2EDE4]">{m.name}</p>
                      <p className="text-[10px] text-[#8A8070]">{m.trade} · {m.unit}</p>
                    </div>
                    <p className="text-sm text-[#F2EDE4] text-right font-medium">{fmt(m.currentPrice) || '—'}</p>
                    <p className="text-[10px] text-[#8A8070] text-right self-center">
                      {m.lowPrice && m.highPrice ? `${fmt(m.lowPrice)}–${fmt(m.highPrice)}` : '—'}
                    </p>
                    <p className={`text-xs text-right self-center ${
                      m.percentChange && m.percentChange > 0 ? 'text-red-400' : m.percentChange && m.percentChange < 0 ? 'text-green-400' : 'text-[#8A8070]'
                    }`}>
                      {m.percentChange !== null ? `${m.percentChange > 0 ? '+' : ''}${m.percentChange.toFixed(1)}%` : '—'}
                    </p>
                    <div className="text-right self-center">
                      {m.alerts.length > 0 && <span className="text-[10px] bg-red-400/20 text-red-400 px-2 py-0.5 rounded-full">{m.alerts.length}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Source Breakdown Side Panel */}
          {selected && (
            <div className="w-full md:w-96 flex-shrink-0">
              <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-6 sticky top-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-medium text-[#F2EDE4]">{selected.name}</h2>
                    <p className="text-xs text-[#8A8070]">{selected.trade} · {selected.unit}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-[#8A8070] hover:text-[#F2EDE4] text-lg">×</button>
                </div>

                {/* Primary Sources */}
                <div className="space-y-2 mb-4">
                  <p className="text-[10px] text-[#8A8070] uppercase tracking-wider">Primary Sources</p>
                  <SourceRow label="Home Depot" price={selected.hdPrice} applicable={true} />
                  <SourceRow label="Lowes" price={selected.lowesPrice} applicable={true} />
                  <SourceRow label="Menards" price={selected.menardsPrice} applicable={isApplicable('Menards', selected.trade)} />
                  <SourceRow label="SupplyHouse" price={selected.supplyHousePrice} applicable={isApplicable('SupplyHouse', selected.trade)} />
                  <SourceRow label="Sherwin-Williams" price={selected.sherwinWilliamsPrice} applicable={isApplicable('SherwinWilliams', selected.trade)} />
                </div>

                <div className="border-t border-[rgba(193,123,42,0.1)] my-4" />

                {/* Reference Sources */}
                <div className="space-y-2 mb-6">
                  <p className="text-[10px] text-[#8A8070] uppercase tracking-wider">Reference Sources</p>
                  <RefSourceRow label="Amazon" price={selected.amazonPrice} applicable={isApplicable('Amazon', selected.trade)} />
                  <RefSourceRow label="Walmart" price={selected.walmartPrice} applicable={isApplicable('Walmart', selected.trade)} />
                  <RefSourceRow label="Target" price={selected.targetPrice} applicable={isApplicable('Target', selected.trade)} />
                </div>

                <div className="border-t border-[rgba(193,123,42,0.1)] my-4" />

                {/* Calculated Values */}
                <div className="space-y-3 mb-6">
                  <p className="text-[10px] text-[#8A8070] uppercase tracking-wider">Calculated Values</p>
                  <div>
                    <p className="text-[10px] text-[#8A8070]">Current Price Used for Estimates</p>
                    <p className="text-xl font-bold text-[#F2EDE4]">{fmt(selected.currentPrice) || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#8A8070]">Price Range</p>
                    <p className="text-sm text-[#F2EDE4]">
                      {selected.lowPrice && selected.highPrice ? `${fmt(selected.lowPrice)} to ${fmt(selected.highPrice)}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#8A8070]">Last Updated</p>
                    <p className="text-sm text-[#F2EDE4]">{formatDate(selected.updatedAt)}</p>
                  </div>
                </div>

                {/* Alerts */}
                {selected.alerts.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] text-red-400 uppercase tracking-wider mb-2">Active Alerts</p>
                    {selected.alerts.map((a) => (
                      <div key={a.id} className="bg-red-400/10 rounded-lg px-3 py-2 mb-1">
                        <p className="text-xs text-red-400">
                          {a.percentChange > 0 ? '+' : ''}{a.percentChange.toFixed(1)}% change
                          {a.sourceStore ? ` from ${a.sourceStore}` : ''}
                        </p>
                        <p className="text-[10px] text-[#8A8070]">{formatDate(a.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => scrapeAllSources(selected.id)}
                  disabled={scraping}
                  className="w-full bg-[#C17B2A] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] disabled:opacity-40 transition-colors"
                >
                  {scraping ? 'Scraping...' : 'Scrape All Sources Now'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SourceRow({ label, price, applicable }: { label: string; price: number | null; applicable: boolean }) {
  if (!applicable) {
    return (
      <div className="flex items-center justify-between py-1">
        <span className="text-sm text-[#8A8070]">{label}</span>
        <span className="text-xs text-[#8A8070]/50 italic">N/A for this trade</span>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-[#F2EDE4]">{label}</span>
      <span className={`text-sm ${price !== null ? 'text-[#F2EDE4] font-medium' : 'text-[#8A8070]/50'}`}>
        {price !== null ? `$${price.toFixed(2)}` : 'Not Available'}
      </span>
    </div>
  )
}

function RefSourceRow({ label, price, applicable }: { label: string; price: number | null; applicable: boolean }) {
  if (!applicable) {
    return (
      <div className="flex items-center justify-between py-1">
        <span className="text-sm text-[#8A8070]">{label}</span>
        <span className="text-xs text-[#8A8070]/50 italic">N/A for this trade</span>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-[#F2EDE4]">{label}</span>
      <span className={`text-sm ${price !== null ? 'text-[#C17B2A]' : 'text-[#8A8070]/50'}`}>
        {price !== null ? `$${price.toFixed(2)} Reference Only` : 'Not Available'}
      </span>
    </div>
  )
}
