'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Lead {
  id: string
  firstName: string
  lastName: string | null
  email: string | null
  phone: string
  address: string | null
  city: string | null
  jobType: string
  jobDescription: string
  urgency: string
  quoteRangeLow: number | null
  quoteRangeHigh: number | null
  bestTimeToCall: string | null
  conversationSummary: string
  sentToGHL: boolean
  createdAt: string
  conversation: { messages: string } | null
}

interface Stats {
  total: number
  leadsThisMonth: number
  sentToGHL: number
  pendingGHL: number
}

export default function LeadsPage() {
  const params = useParams()
  const id = params.id as string
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, leadsThisMonth: 0, sentToGHL: 0, pendingGHL: 0 })
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/clients/' + id + '/leads')
      .then((r) => r.json())
      .then((data) => {
        setLeads(data.leads || [])
        setStats(data.stats || { total: 0, leadsThisMonth: 0, sentToGHL: 0, pendingGHL: 0 })
        setBusinessName(data.client?.businessName || '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const exportCsv = () => {
    const headers = ['Date', 'Name', 'Phone', 'Email', 'Job Type', 'Urgency', 'Quote Range', 'Summary', 'GHL Status']
    const rows = leads.map((l) => [
      new Date(l.createdAt).toLocaleString(),
      [l.firstName, l.lastName].filter(Boolean).join(' '),
      l.phone,
      l.email || '',
      l.jobType,
      l.urgency,
      l.quoteRangeLow && l.quoteRangeHigh ? '$' + l.quoteRangeLow + ' - $' + l.quoteRangeHigh : '',
      '"' + (l.conversationSummary || '').replace(/"/g, '""') + '"',
      l.sentToGHL ? 'Sent' : 'Pending',
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = businessName.replace(/\s+/g, '_') + '_leads.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const urgencyBadge = (u: string) => {
    const colors: Record<string, string> = {
      emergency: 'bg-red-900/40 text-red-400',
      soon: 'bg-yellow-900/40 text-yellow-400',
      planning: 'bg-zinc-700/40 text-zinc-400',
    }
    return colors[u] || colors.planning
  }

  const formatDate = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const parseMessages = (messagesStr: string) => {
    try {
      return JSON.parse(messagesStr) as Array<{ role: string; content: string }>
    } catch {
      return []
    }
  }

  if (loading) return <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center text-[#8A8070]">Loading...</div>

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div>
            <Link href="/" className="text-sm text-[#8A8070] hover:text-[#C17B2A] transition-colors mb-2 inline-block">&larr; Dashboard</Link>
            <h1 className="text-2xl font-semibold text-[#F2EDE4]">{businessName}</h1>
            <p className="text-sm text-[#8A8070]">Leads</p>
          </div>
          <button onClick={exportCsv} className="border border-[rgba(193,123,42,0.3)] text-[#C17B2A] px-4 py-2 rounded-lg text-sm hover:bg-[rgba(193,123,42,0.1)] transition-colors">Export CSV</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
          {[
            { label: 'Total Leads', value: stats.total },
            { label: 'This Month', value: stats.leadsThisMonth },
            { label: 'Sent to GHL', value: stats.sentToGHL },
            { label: 'Pending GHL', value: stats.pendingGHL },
          ].map((s) => (
            <div key={s.label} className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
              <div className="text-2xl font-semibold text-[#C17B2A]">{s.value}</div>
              <div className="text-xs text-[#8A8070] mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {leads.length === 0 ? (
          <div className="text-center py-20 text-[#8A8070]">No leads yet</div>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => (
              <div key={lead.id} className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}
                  className="w-full text-left p-4 hover:bg-[rgba(193,123,42,0.05)] transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <div className="text-xs text-[#8A8070] w-32">{formatDate(lead.createdAt)}</div>
                    <div className="min-w-[140px]">
                      <div className="text-sm text-[#F2EDE4] font-medium">{lead.firstName} {lead.lastName || ''}</div>
                      <div className="text-xs text-[#8A8070]">{lead.phone}{lead.email ? ' / ' + lead.email : ''}</div>
                    </div>
                    <div className="min-w-[120px]">
                      <div className="text-sm text-[#F2EDE4]">{lead.jobType}</div>
                      <span className={'inline-block px-2 py-0.5 rounded text-xs mt-0.5 ' + urgencyBadge(lead.urgency)}>{lead.urgency}</span>
                    </div>
                    <div className="text-sm text-[#F2EDE4]">{lead.quoteRangeLow && lead.quoteRangeHigh ? '$' + lead.quoteRangeLow + ' - $' + lead.quoteRangeHigh : '-'}</div>
                    <div className="flex-1 text-xs text-[#8A8070] truncate max-w-xs">{lead.conversationSummary}</div>
                    <div>{lead.sentToGHL ? <span className="text-green-400 text-sm">&#10003;</span> : <span className="text-red-400 text-sm">&#10007;</span>}</div>
                  </div>
                </button>

                {expanded === lead.id && (
                  <div className="border-t border-[rgba(193,123,42,0.1)] p-4 bg-[#161410]">
                    <div className="mb-3">
                      <h4 className="text-xs text-[#8A8070] uppercase tracking-wider mb-1">Summary</h4>
                      <p className="text-sm text-[#F2EDE4]">{lead.conversationSummary}</p>
                    </div>
                    {lead.address && <p className="text-xs text-[#8A8070] mb-1">Address: {lead.address}{lead.city ? ', ' + lead.city : ''}</p>}
                    {lead.bestTimeToCall && <p className="text-xs text-[#8A8070] mb-3">Best time to call: {lead.bestTimeToCall}</p>}
                    {lead.conversation?.messages && (
                      <div>
                        <h4 className="text-xs text-[#8A8070] uppercase tracking-wider mb-2">Conversation Transcript</h4>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {parseMessages(lead.conversation.messages).map((msg, i) => (
                            <div key={i} className={'text-xs p-2 rounded ' + (msg.role === 'user' ? 'bg-[rgba(193,123,42,0.1)] text-[#F2EDE4]' : 'bg-[#1E1B16] text-[#8A8070]')}>
                              <span className="font-medium">{msg.role === 'user' ? 'Customer' : 'Agent'}:</span> {msg.content}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
