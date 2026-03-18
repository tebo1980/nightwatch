'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import ClientForm from '@/app/components/ClientForm'

interface BusinessHoursMap {
  [day: string]: { open: boolean; start: string; close: string }
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function parseHours(raw: string): BusinessHoursMap {
  try {
    const parsed = JSON.parse(raw) as Record<string, string>
    const result: BusinessHoursMap = {}
    for (const day of DAYS) {
      const val = parsed[day]
      if (!val || val === 'Closed') {
        result[day] = { open: false, start: '09:00', close: '17:00' }
      } else {
        const [start, close] = val.split('-')
        result[day] = { open: true, start: start || '09:00', close: close || '17:00' }
      }
    }
    return result
  } catch {
    const result: BusinessHoursMap = {}
    for (const day of DAYS) {
      result[day] = { open: false, start: '09:00', close: '17:00' }
    }
    return result
  }
}

function parsePricing(raw: string): Record<string, { low: number; high: number }> {
  try {
    const parsed = JSON.parse(raw) as Record<string, string>
    const result: Record<string, { low: number; high: number }> = {}
    for (const [job, range] of Object.entries(parsed)) {
      const match = range.match(/\$(\d+)\s*-\s*\$(\d+)/)
      result[job] = { low: match ? Number(match[1]) : 0, high: match ? Number(match[2]) : 0 }
    }
    return result
  } catch {
    return {}
  }
}

export default function EditClientPage() {
  const params = useParams()
  const id = params.id as string
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/clients/' + id)
      .then((r) => r.json())
      .then((d) => setData(d.client))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center text-[#8A8070]">Loading...</div>
  if (!data) return <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center text-red-400">Client not found</div>

  let jobTypes: string[] = []
  try { jobTypes = JSON.parse(data.jobTypes as string) } catch { jobTypes = [] }

  const initialData = {
    id: data.id as string,
    businessName: data.businessName as string,
    agentName: data.agentName as string,
    agentPersonality: data.agentPersonality as string,
    phoneNumber: data.phoneNumber as string,
    email: data.email as string,
    website: (data.website as string) || '',
    widgetColor: data.widgetColor as string,
    greeting: data.greeting as string,
    serviceArea: data.serviceArea as string,
    emergencyAvail: data.emergencyAvail as boolean,
    businessHours: parseHours(data.businessHours as string),
    jobTypes: jobTypes,
    pricingRanges: parsePricing(data.pricingRanges as string),
    ghlWebhookUrl: (data.ghlWebhookUrl as string) || '',
    ghlApiKey: (data.ghlApiKey as string) || '',
    isActive: data.isActive as boolean,
  }

  return <ClientForm initialData={initialData} isEdit />
}
