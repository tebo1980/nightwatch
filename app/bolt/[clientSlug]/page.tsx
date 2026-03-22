'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface BoltConfig {
  id: string
  clientSlug: string
  businessName: string
  businessPhone: string
  businessEmail: string
  trade: string
  laborRatePerHour: number
}

export default function ContractorBoltView() {
  const params = useParams()
  const clientSlug = params.clientSlug as string
  const [config, setConfig] = useState<BoltConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/bolt/config`)
      .then((r) => r.json())
      .then((data) => {
        const found = (data.configs || []).find((c: BoltConfig) => c.clientSlug === clientSlug)
        if (found) {
          setConfig(found)
        } else {
          setNotFound(true)
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [clientSlug])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center">
        <p className="text-[#8A8070]">Loading...</p>
      </div>
    )
  }

  if (notFound || !config) {
    return (
      <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-[#F2EDE4] mb-2">Not Found</h1>
          <p className="text-sm text-[#8A8070]">This Bolt link is not configured.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6 pt-4">
          <h1 className="text-xl font-semibold text-[#F2EDE4]">{config.businessName}</h1>
          <p className="text-sm text-[#C17B2A] mt-1">&#9889; Estimate Builder</p>
          <p className="text-xs text-[#8A8070] mt-1">{config.trade} &middot; ${config.laborRatePerHour}/hr</p>
        </div>

        {/* Placeholder for estimate builder — implemented in Bolt Prompt 2 */}
        <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-6 text-center">
          <p className="text-[#C17B2A] text-3xl mb-3">&#9889;</p>
          <h2 className="text-base font-medium text-[#F2EDE4] mb-2">Estimate Builder</h2>
          <p className="text-sm text-[#8A8070]">
            The on-site estimate form will be built in the next prompt.
          </p>
          <p className="text-xs text-[#8A8070] mt-4">
            You&apos;ll be able to add materials from Atlas pricing, set labor hours, and generate a professional PDF estimate to send to your customer.
          </p>
        </div>
      </div>
    </div>
  )
}
