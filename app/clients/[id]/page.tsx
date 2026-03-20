'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface ClientData {
  id: string
  businessName: string
  ownerName: string
  ownerFirstName: string
  ownerEmail: string
  industry: string
  city: string
  state: string
  tier: string
  active: boolean
}

export default function ClientPage() {
  const params = useParams()
  const [client, setClient] = useState<ClientData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!params.id) return
    fetch(`/api/onboarding/get-client?id=${params.id}`)
      .then((r) => r.json())
      .then((data) => setClient(data.client || null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) return <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center text-[#8A8070]">Loading...</div>
  if (!client) return <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center text-[#8A8070]">Client not found</div>

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-sm text-[#8A8070] hover:text-[#C17B2A] transition-colors mb-6 inline-block">&larr; Back to Dashboard</Link>
        <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-6 md:p-8">
          <h1 className="text-2xl font-semibold text-[#F2EDE4] mb-1">{client.businessName}</h1>
          <p className="text-sm text-[#8A8070] mb-6">{client.industry} &middot; {client.city}, {client.state}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-[#8A8070]">Owner:</span> <span className="text-[#F2EDE4] ml-2">{client.ownerName}</span></div>
            <div><span className="text-[#8A8070]">Email:</span> <span className="text-[#F2EDE4] ml-2">{client.ownerEmail}</span></div>
            <div><span className="text-[#8A8070]">Tier:</span> <span className="text-[#F2EDE4] ml-2">{client.tier}</span></div>
            <div><span className="text-[#8A8070]">Status:</span> <span className="text-[#F2EDE4] ml-2">{client.active ? 'Active' : 'Inactive'}</span></div>
          </div>
          <p className="text-xs text-[#8A8070] mt-8">Full client dashboard coming with agent modules.</p>
        </div>
      </div>
    </div>
  )
}
