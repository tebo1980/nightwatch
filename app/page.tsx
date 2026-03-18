'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ClientWithStats {
  id: string
  businessName: string
  agentName: string
  isActive: boolean
  widgetColor: string
  leadsThisMonth: number
  convsThisMonth: number
  ghlSentThisMonth: number
  lastActivity: string | null
}

export default function Dashboard() {
  const [clients, setClients] = useState<ClientWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then((data) => setClients(data.clients || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const activeClients = clients.filter((c) => c.isActive).length
  const totalLeads = clients.reduce((s, c) => s + c.leadsThisMonth, 0)
  const totalConvs = clients.reduce((s, c) => s + c.convsThisMonth, 0)
  const totalGHL = clients.reduce((s, c) => s + c.ghlSentThisMonth, 0)

  const copyEmbed = (client: ClientWithStats) => {
    const code = '<script>\nwindow.NightwatchConfig = {\n  clientId: "' + client.id + '",\n  agentName: "' + client.agentName + '",\n  businessName: "' + client.businessName + '",\n  widgetColor: "' + client.widgetColor + '",\n  apiUrl: "https://nightwatch.baratrust.com/api/chat",\n  greeting: "Hi! How can I help you today?"\n}\n</scr' + 'ipt>\n<script src="https://nightwatch.baratrust.com/nightwatch-widget.js" async></scr' + 'ipt>'
    navigator.clipboard.writeText(code)
    setCopiedId(client.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatDate = (d: string | null) => {
    if (!d) return 'No activity'
    const diff = Date.now() - new Date(d).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return mins + 'm ago'
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return hrs + 'h ago'
    return Math.floor(hrs / 24) + 'd ago'
  }

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-[#F2EDE4]">Nightwatch Admin</h1>
            <p className="text-sm text-[#8A8070]">BaraTrust AI Sales Agent Platform</p>
          </div>
          <Link href="/clients/new" className="bg-[#C17B2A] text-white w-10 h-10 rounded-full flex items-center justify-center text-xl hover:bg-[#D4892F] transition-colors">+</Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Active Clients', value: activeClients },
            { label: 'Leads This Month', value: totalLeads },
            { label: 'Conversations This Month', value: totalConvs },
            { label: 'Sent to GHL', value: totalGHL },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
              <div className="text-2xl font-semibold text-[#C17B2A]">{stat.value}</div>
              <div className="text-xs text-[#8A8070] mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-[#8A8070] py-20">Loading...</div>
        ) : clients.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#8A8070] mb-4">No clients yet</p>
            <Link href="/clients/new" className="bg-[#C17B2A] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors">Add Your First Client</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clients.map((client) => (
              <div key={client.id} className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${client.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                      <h3 className="text-lg font-medium text-[#F2EDE4]">{client.businessName}</h3>
                    </div>
                    <p className="text-sm text-[#C17B2A] mt-0.5">{client.agentName}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div><div className="text-lg font-medium text-[#F2EDE4]">{client.leadsThisMonth}</div><div className="text-xs text-[#8A8070]">Leads</div></div>
                  <div><div className="text-lg font-medium text-[#F2EDE4]">{client.convsThisMonth}</div><div className="text-xs text-[#8A8070]">Conversations</div></div>
                  <div><div className="text-sm text-[#F2EDE4]">{formatDate(client.lastActivity)}</div><div className="text-xs text-[#8A8070]">Last Activity</div></div>
                </div>
                <div className="flex gap-2 mb-3">
                  <Link href={'/clients/' + client.id + '/leads'} className="flex-1 text-center border border-[rgba(193,123,42,0.3)] text-[#C17B2A] px-3 py-2 rounded-lg text-sm hover:bg-[rgba(193,123,42,0.1)] transition-colors">View Leads</Link>
                  <Link href={'/clients/' + client.id + '/edit'} className="flex-1 text-center border border-[rgba(193,123,42,0.3)] text-[#C17B2A] px-3 py-2 rounded-lg text-sm hover:bg-[rgba(193,123,42,0.1)] transition-colors">Edit</Link>
                </div>
                <button onClick={() => copyEmbed(client)} className="w-full text-xs text-[#8A8070] hover:text-[#C17B2A] transition-colors py-1">{copiedId === client.id ? <span className="text-green-400">Copied!</span> : "Click to copy embed code"}</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
