'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const INDUSTRIES = [
  'Contracting', 'Pest Control', 'HVAC', 'Plumbing', 'Electrical',
  'Landscaping', 'Cleaning', 'Painting', 'Roofing', 'Pressure Washing',
  'Pool Service', 'Gym/Personal Training', 'Auto Detailing', 'Pet Grooming',
  'Medical/Therapy', 'Restaurant', 'Salon/Barber', 'Other',
]

const TONES = [
  { value: 'friendly', label: 'Friendly and warm' },
  { value: 'professional', label: 'Professional and polished' },
  { value: 'casual', label: 'Casual and conversational' },
  { value: 'direct', label: 'Direct and no-nonsense' },
  { value: 'formal', label: 'Formal' },
]

const TICKET_SIZES = [
  'Under $200', '$200-500', '$500-1000', '$1000-2500', '$2500-5000', 'Over $5000',
]

const TIERS = [
  { value: 'starter', label: 'Starter $299/mo' },
  { value: 'complete', label: 'Complete $599/mo' },
  { value: 'complete_plus', label: 'Complete+ $799/mo' },
  { value: 'agents_only', label: 'Agents Only $399/mo' },
  { value: 'restaurant', label: 'Restaurant $999/mo' },
  { value: 'medical', label: 'Medical $699/mo' },
  { value: 'custom', label: 'Custom' },
]

const AGENTS = [
  { key: 'novaEnabled', name: 'Nova', desc: '24/7 website agent, captures leads and sends SMS alerts' },
  { key: 'rexEnabled', name: 'Rex', desc: 'Monitors reviews, drafts responses in your voice' },
  { key: 'irisEnabled', name: 'Iris', desc: 'Follows up automatically with leads that go cold' },
  { key: 'maxEnabled', name: 'Max', desc: 'Sends review requests and payment reminders' },
  { key: 'dellaEnabled', name: 'Della', desc: 'Drafts business emails when you describe what you need' },
  { key: 'flynnEnabled', name: 'Flynn', desc: 'Tracks vehicles, mileage, maintenance schedules' },
  { key: 'coleEnabled', name: 'Cole', desc: 'Tracks inventory and cost of goods' },
  { key: 'riverEnabled', name: 'River', desc: 'Manages appointments and sends reminders' },
  { key: 'sageEnabled', name: 'Sage', desc: 'Drafts and schedules social media posts' },
  { key: 'atlasEnabled', name: 'Atlas', desc: 'Full restaurant intelligence (reservations, inventory, menu performance)' },
] as const

type FormData = {
  businessName: string; industry: string; ownerName: string; ownerFirstName: string
  ownerEmail: string; contactPhone: string; website: string; businessAddress: string
  city: string; state: string; zipCode: string
  tonePreference: string; tagline: string; servicesOffered: string; typicalJobTypes: string
  avgTicketSize: string; idealCustomer: string
  novaEnabled: boolean; rexEnabled: boolean; irisEnabled: boolean; maxEnabled: boolean
  dellaEnabled: boolean; flynnEnabled: boolean; coleEnabled: boolean; riverEnabled: boolean
  sageEnabled: boolean; atlasEnabled: boolean
  googleReviewLink: string; googlePlaceId: string; yelpBusinessId: string
  irisFollowUpDay1: number; irisFollowUpDay2: number; irisFollowUpDay3: number
  maxReviewDelayDays: number; maxPaymentReminderDays: string
  riverBusinessHours: string; riverAppointmentTypes: string
  tier: string; notes: string
}

const initialForm: FormData = {
  businessName: '', industry: '', ownerName: '', ownerFirstName: '',
  ownerEmail: '', contactPhone: '', website: '', businessAddress: '',
  city: '', state: '', zipCode: '',
  tonePreference: 'friendly', tagline: '', servicesOffered: '', typicalJobTypes: '',
  avgTicketSize: '', idealCustomer: '',
  novaEnabled: false, rexEnabled: false, irisEnabled: false, maxEnabled: false,
  dellaEnabled: false, flynnEnabled: false, coleEnabled: false, riverEnabled: false,
  sageEnabled: false, atlasEnabled: false,
  googleReviewLink: '', googlePlaceId: '', yelpBusinessId: '',
  irisFollowUpDay1: 1, irisFollowUpDay2: 3, irisFollowUpDay3: 7,
  maxReviewDelayDays: 2, maxPaymentReminderDays: '7,14,30',
  riverBusinessHours: '', riverAppointmentTypes: '',
  tier: 'complete', notes: '',
}

const STEP_LABELS = ['Business Identity', 'Brand Voice', 'Agent Config', 'Subscription', 'Review & Confirm']

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [createdClient, setCreatedClient] = useState<{ id: string; businessName: string } | null>(null)
  // Bolt setup (optional post-creation)
  const [showBoltSetup, setShowBoltSetup] = useState(false)
  const [boltSlug, setBoltSlug] = useState('')
  const [boltLaborRate, setBoltLaborRate] = useState(75)
  const [boltTrade, setBoltTrade] = useState('')
  const [boltSaving, setBoltSaving] = useState(false)
  const [boltDone, setBoltDone] = useState(false)
  const [error, setError] = useState('')

  const set = (field: keyof FormData, value: string | boolean | number) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const canAdvance = () => {
    if (step === 1) return form.businessName && form.industry && form.ownerName && form.ownerFirstName && form.ownerEmail && form.city && form.state
    if (step === 2) return form.servicesOffered
    return true
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/onboarding/create-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create client')
      setCreatedClient({ id: data.client.id, businessName: data.client.businessName })
      setBoltSlug(form.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))
      setBoltTrade(form.industry === 'Plumbing' ? 'Plumber' : form.industry === 'HVAC' ? 'HVAC' : form.industry === 'Electrical' ? 'Electrician' : form.industry === 'Painting' ? 'Painter' : form.industry === 'Roofing' ? 'Roofer' : form.industry === 'Landscaping' ? 'Landscaper' : form.industry === 'Contracting' ? 'General Contractor' : 'Handyman')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function setupBolt() {
    if (!createdClient) return
    setBoltSaving(true)
    try {
      await fetch('/api/bolt/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: createdClient.id, clientSlug: boltSlug, businessName: createdClient.businessName,
          businessPhone: form.contactPhone, businessEmail: form.ownerEmail, trade: boltTrade, laborRatePerHour: boltLaborRate,
        }),
      })
      setBoltDone(true)
    } catch { /* */ } finally { setBoltSaving(false) }
  }

  if (createdClient) {
    return (
      <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center p-6">
        <div className="bg-[#1E1B16] border border-green-500/30 rounded-2xl p-10 text-center max-w-md w-full">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-xl font-semibold text-[#F2EDE4] mb-2">Client Created</h2>
          <p className="text-[#8A8070] mb-6">{createdClient.businessName} has been onboarded successfully.</p>

          {/* Bolt setup */}
          {!boltDone && !showBoltSetup && (
            <button onClick={() => setShowBoltSetup(true)} className="w-full border border-dashed border-[rgba(193,123,42,0.3)] text-[#C17B2A] px-4 py-3 rounded-lg text-sm mb-4 hover:bg-[rgba(193,123,42,0.05)]">&#9889; Set up Bolt estimate builder? (optional)</button>
          )}
          {showBoltSetup && !boltDone && (
            <div className="bg-[#0E0C0A] rounded-lg p-4 mb-4 text-left space-y-3">
              <div>
                <label className="block text-xs text-[#8A8070] mb-1">Client Slug</label>
                <input type="text" value={boltSlug} onChange={(e) => setBoltSlug(e.target.value)} className="w-full bg-[#1E1B16] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] font-mono focus:outline-none focus:border-[#C17B2A]" />
                <p className="text-[10px] text-[#8A8070] mt-1">nightwatch.baratrust.com/bolt/{boltSlug}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Labor Rate ($/hr)</label>
                  <input type="number" value={boltLaborRate} onChange={(e) => setBoltLaborRate(parseFloat(e.target.value) || 75)} className="w-full bg-[#1E1B16] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" />
                </div>
                <div>
                  <label className="block text-xs text-[#8A8070] mb-1">Trade</label>
                  <select value={boltTrade} onChange={(e) => setBoltTrade(e.target.value)} className="w-full bg-[#1E1B16] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]">
                    {['Plumber','HVAC','Electrician','General Contractor','Painter','Roofer','Landscaper','Handyman','Deck Builder','Concrete'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={setupBolt} disabled={boltSaving || !boltSlug} className="flex-1 bg-[#C17B2A] text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">{boltSaving ? 'Setting up...' : 'Enable Bolt'}</button>
                <button onClick={() => setShowBoltSetup(false)} className="px-4 py-2 text-sm text-[#8A8070] border border-[rgba(193,123,42,0.2)] rounded-lg">Skip</button>
              </div>
            </div>
          )}
          {boltDone && (
            <div className="bg-green-500/10 text-green-400 text-sm px-4 py-2 rounded-lg mb-4">&#9889; Bolt enabled at /bolt/{boltSlug}</div>
          )}

          {/* Nextdoor Setup */}
          <NextdoorSetupSection clientId={createdClient.id} />

          <div className="flex flex-col gap-3">
            <Link href={`/clients/${createdClient.id}`} className="bg-[#C17B2A] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors">
              View Client Dashboard
            </Link>
            <Link href={`/lsa?clientId=${createdClient.id}`} className="border border-[rgba(193,123,42,0.3)] text-[#C17B2A] px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[rgba(193,123,42,0.1)] transition-colors text-center">
              📋 LSA Setup Tracker
            </Link>
            <Link href="/" className="border border-[rgba(193,123,42,0.3)] text-[#C17B2A] px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[rgba(193,123,42,0.1)] transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const inputCls = 'w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] transition-colors placeholder:text-[#8A8070]/50'
  const labelCls = 'block text-xs font-medium text-[#8A8070] mb-1.5'
  const selectCls = inputCls

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-[#F2EDE4]">Client Onboarding</h1>
            <p className="text-sm text-[#8A8070]">BaraTrust AI Staff Setup</p>
          </div>
          <Link href="/" className="text-sm text-[#8A8070] hover:text-[#C17B2A] transition-colors">Cancel</Link>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 mb-8">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors ${i + 1 <= step ? 'bg-[#C17B2A]' : 'bg-[#1E1B16]'}`} />
              <p className={`text-[10px] mt-1.5 ${i + 1 === step ? 'text-[#C17B2A]' : 'text-[#8A8070]/50'}`}>{label}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-6 md:p-8">
          {/* STEP 1 — Business Identity */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-medium text-[#F2EDE4] mb-4">Business Identity</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={labelCls}>Business Name *</label>
                  <input className={inputCls} value={form.businessName} onChange={(e) => set('businessName', e.target.value)} placeholder="Acme Plumbing Co." />
                </div>
                <div>
                  <label className={labelCls}>Industry *</label>
                  <select className={selectCls} value={form.industry} onChange={(e) => set('industry', e.target.value)}>
                    <option value="">Select industry...</option>
                    {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Owner Full Name *</label>
                  <input className={inputCls} value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} placeholder="John Smith" />
                </div>
                <div>
                  <label className={labelCls}>Owner First Name * <span className="text-[#8A8070]/60">(used in agent messages)</span></label>
                  <input className={inputCls} value={form.ownerFirstName} onChange={(e) => set('ownerFirstName', e.target.value)} placeholder="John" />
                </div>
                <div>
                  <label className={labelCls}>Owner Email *</label>
                  <input className={inputCls} type="email" value={form.ownerEmail} onChange={(e) => set('ownerEmail', e.target.value)} placeholder="john@acmeplumbing.com" />
                </div>
                <div>
                  <label className={labelCls}>Contact Phone</label>
                  <input className={inputCls} type="tel" value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} placeholder="(555) 123-4567" />
                </div>
                <div>
                  <label className={labelCls}>Website URL</label>
                  <input className={inputCls} value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://acmeplumbing.com" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Business Address</label>
                  <input className={inputCls} value={form.businessAddress} onChange={(e) => set('businessAddress', e.target.value)} placeholder="123 Main St" />
                </div>
                <div>
                  <label className={labelCls}>City *</label>
                  <input className={inputCls} value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Austin" />
                </div>
                <div>
                  <label className={labelCls}>State *</label>
                  <input className={inputCls} value={form.state} onChange={(e) => set('state', e.target.value)} placeholder="TX" />
                </div>
                <div>
                  <label className={labelCls}>Zip Code</label>
                  <input className={inputCls} value={form.zipCode} onChange={(e) => set('zipCode', e.target.value)} placeholder="78701" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Brand Voice */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-medium text-[#F2EDE4] mb-4">Brand Voice</h2>
              <div>
                <label className={labelCls}>Tone Preference</label>
                <select className={selectCls} value={form.tonePreference} onChange={(e) => set('tonePreference', e.target.value)}>
                  {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Tagline or Motto <span className="text-[#8A8070]/60">(how would you describe your business in one line?)</span></label>
                <input className={inputCls} value={form.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="We fix it right the first time." />
              </div>
              <div>
                <label className={labelCls}>Services Offered * <span className="text-[#8A8070]/60">(list your main services, one per line)</span></label>
                <textarea className={inputCls + ' min-h-[100px]'} value={form.servicesOffered} onChange={(e) => set('servicesOffered', e.target.value)} placeholder={"Residential plumbing\nCommercial plumbing\nDrain cleaning\nWater heater installation"} />
              </div>
              <div>
                <label className={labelCls}>Typical Job Types <span className="text-[#8A8070]/60">(what does a typical job look like?)</span></label>
                <textarea className={inputCls + ' min-h-[80px]'} value={form.typicalJobTypes} onChange={(e) => set('typicalJobTypes', e.target.value)} placeholder="Faucet repairs, toilet replacements, leak detection..." />
              </div>
              <div>
                <label className={labelCls}>Average Ticket Size</label>
                <select className={selectCls} value={form.avgTicketSize} onChange={(e) => set('avgTicketSize', e.target.value)}>
                  <option value="">Select range...</option>
                  {TICKET_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Ideal Customer Description <span className="text-[#8A8070]/60">(describe your best customer)</span></label>
                <textarea className={inputCls + ' min-h-[80px]'} value={form.idealCustomer} onChange={(e) => set('idealCustomer', e.target.value)} placeholder="Homeowners in suburban areas who value quality work and are willing to pay fair prices..." />
              </div>
            </div>
          )}

          {/* STEP 3 — Agent Configuration */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-medium text-[#F2EDE4] mb-4">Agent Configuration</h2>
              <p className="text-sm text-[#8A8070] mb-4">Which agents are active for this client?</p>
              <div className="space-y-3">
                {AGENTS.map((agent) => (
                  <div key={agent.key} className="flex items-center justify-between bg-[#0E0C0A] rounded-lg px-4 py-3 border border-[rgba(193,123,42,0.1)]">
                    <div>
                      <span className="text-sm font-medium text-[#F2EDE4]">{agent.name}</span>
                      <span className="text-xs text-[#8A8070] ml-2">{agent.desc}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => set(agent.key, !form[agent.key])}
                      className={`w-11 h-6 rounded-full transition-colors relative ${form[agent.key] ? 'bg-[#C17B2A]' : 'bg-[#2A2520]'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${form[agent.key] ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Conditional fields */}
              {form.rexEnabled && (
                <div className="border-t border-[rgba(193,123,42,0.1)] pt-5 mt-5 space-y-4">
                  <h3 className="text-sm font-medium text-[#C17B2A]">Rex Configuration</h3>
                  <div>
                    <label className={labelCls}>Google Review Link</label>
                    <input className={inputCls} value={form.googleReviewLink} onChange={(e) => set('googleReviewLink', e.target.value)} placeholder="https://g.page/r/..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Google Place ID</label>
                      <input className={inputCls} value={form.googlePlaceId} onChange={(e) => set('googlePlaceId', e.target.value)} placeholder="ChIJ..." />
                    </div>
                    <div>
                      <label className={labelCls}>Yelp Business ID</label>
                      <input className={inputCls} value={form.yelpBusinessId} onChange={(e) => set('yelpBusinessId', e.target.value)} placeholder="acme-plumbing-austin" />
                    </div>
                  </div>
                </div>
              )}

              {form.irisEnabled && (
                <div className="border-t border-[rgba(193,123,42,0.1)] pt-5 mt-5 space-y-4">
                  <h3 className="text-sm font-medium text-[#C17B2A]">Iris Configuration</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className={labelCls}>Follow-up Day 1</label>
                      <input className={inputCls} type="number" value={form.irisFollowUpDay1} onChange={(e) => set('irisFollowUpDay1', parseInt(e.target.value) || 1)} />
                    </div>
                    <div>
                      <label className={labelCls}>Follow-up Day 2</label>
                      <input className={inputCls} type="number" value={form.irisFollowUpDay2} onChange={(e) => set('irisFollowUpDay2', parseInt(e.target.value) || 3)} />
                    </div>
                    <div>
                      <label className={labelCls}>Follow-up Day 3</label>
                      <input className={inputCls} type="number" value={form.irisFollowUpDay3} onChange={(e) => set('irisFollowUpDay3', parseInt(e.target.value) || 7)} />
                    </div>
                  </div>
                </div>
              )}

              {form.maxEnabled && (
                <div className="border-t border-[rgba(193,123,42,0.1)] pt-5 mt-5 space-y-4">
                  <h3 className="text-sm font-medium text-[#C17B2A]">Max Configuration</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Review Request Delay (days)</label>
                      <input className={inputCls} type="number" value={form.maxReviewDelayDays} onChange={(e) => set('maxReviewDelayDays', parseInt(e.target.value) || 2)} />
                    </div>
                    <div>
                      <label className={labelCls}>Payment Reminder Days</label>
                      <input className={inputCls} value={form.maxPaymentReminderDays} onChange={(e) => set('maxPaymentReminderDays', e.target.value)} placeholder="7,14,30" />
                    </div>
                  </div>
                </div>
              )}

              {form.riverEnabled && (
                <div className="border-t border-[rgba(193,123,42,0.1)] pt-5 mt-5 space-y-4">
                  <h3 className="text-sm font-medium text-[#C17B2A]">River Configuration</h3>
                  <div>
                    <label className={labelCls}>Business Hours</label>
                    <textarea className={inputCls + ' min-h-[80px]'} value={form.riverBusinessHours} onChange={(e) => set('riverBusinessHours', e.target.value)} placeholder={"Mon-Fri: 8am-5pm\nSat: 9am-2pm\nSun: Closed"} />
                  </div>
                  <div>
                    <label className={labelCls}>Appointment Types</label>
                    <textarea className={inputCls + ' min-h-[80px]'} value={form.riverAppointmentTypes} onChange={(e) => set('riverAppointmentTypes', e.target.value)} placeholder={"Consultation (30 min)\nService Call (60 min)\nEstimate (45 min)"} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4 — Subscription */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-lg font-medium text-[#F2EDE4] mb-4">Subscription Details</h2>
              <div>
                <label className={labelCls}>Tier</label>
                <select className={selectCls} value={form.tier} onChange={(e) => set('tier', e.target.value)}>
                  {TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Internal Notes <span className="text-[#8A8070]/60">(Todd only — not shown to client)</span></label>
                <textarea className={inputCls + ' min-h-[100px]'} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Any internal notes about this client..." />
              </div>
            </div>
          )}

          {/* STEP 5 — Review & Confirm */}
          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-[#F2EDE4] mb-4">Review & Confirm</h2>

              <Section title="Business Identity">
                <Row label="Business Name" value={form.businessName} />
                <Row label="Industry" value={form.industry} />
                <Row label="Owner" value={`${form.ownerName} (${form.ownerFirstName})`} />
                <Row label="Email" value={form.ownerEmail} />
                {form.contactPhone && <Row label="Phone" value={form.contactPhone} />}
                {form.website && <Row label="Website" value={form.website} />}
                <Row label="Location" value={`${form.city}, ${form.state}${form.zipCode ? ' ' + form.zipCode : ''}`} />
                {form.businessAddress && <Row label="Address" value={form.businessAddress} />}
              </Section>

              <Section title="Brand Voice">
                <Row label="Tone" value={TONES.find((t) => t.value === form.tonePreference)?.label || form.tonePreference} />
                {form.tagline && <Row label="Tagline" value={form.tagline} />}
                <Row label="Services" value={form.servicesOffered} />
                {form.typicalJobTypes && <Row label="Job Types" value={form.typicalJobTypes} />}
                {form.avgTicketSize && <Row label="Avg Ticket" value={form.avgTicketSize} />}
                {form.idealCustomer && <Row label="Ideal Customer" value={form.idealCustomer} />}
              </Section>

              <Section title="Active Agents">
                <div className="flex flex-wrap gap-2">
                  {AGENTS.filter((a) => form[a.key]).map((a) => (
                    <span key={a.key} className="bg-[#C17B2A]/20 text-[#C17B2A] text-xs px-3 py-1 rounded-full">{a.name}</span>
                  ))}
                  {AGENTS.every((a) => !form[a.key]) && <span className="text-[#8A8070] text-sm">None selected</span>}
                </div>
              </Section>

              <Section title="Subscription">
                <Row label="Tier" value={TIERS.find((t) => t.value === form.tier)?.label || form.tier} />
                {form.notes && <Row label="Notes" value={form.notes} />}
              </Section>

              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[rgba(193,123,42,0.1)]">
            {step > 1 ? (
              <button onClick={() => setStep(step - 1)} className="text-sm text-[#8A8070] hover:text-[#C17B2A] transition-colors">Back</button>
            ) : <div />}

            {step < 5 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canAdvance()}
                className="bg-[#C17B2A] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="border border-[rgba(193,123,42,0.3)] text-[#C17B2A] px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[rgba(193,123,42,0.1)] transition-colors">
                  Edit
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-[#C17B2A] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-60"
                >
                  {submitting ? 'Creating...' : 'Create Client'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0E0C0A] rounded-lg p-4 border border-[rgba(193,123,42,0.1)]">
      <h3 className="text-xs font-medium text-[#C17B2A] mb-3 uppercase tracking-wider">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-xs text-[#8A8070] w-28 shrink-0">{label}</span>
      <span className="text-sm text-[#F2EDE4] whitespace-pre-line">{value}</span>
    </div>
  )
}

// ─── Nextdoor Business Page Setup ───────────────────────────────────

const NEXTDOOR_ITEMS = [
  { key: 'nd_claim_page', label: 'Create or claim Nextdoor business page for this client' },
  { key: 'nd_category', label: 'Set primary business category matching their trade' },
  { key: 'nd_description', label: 'Write business description in neighbor voice — warm, local, no jargon' },
  { key: 'nd_photos', label: 'Upload at least 5 photos — team, truck, recent jobs, before and after' },
  { key: 'nd_service_area', label: 'Add service area covering all relevant neighborhoods and zip codes' },
  { key: 'nd_phone_website', label: 'Add phone number and website link' },
  { key: 'nd_first_recommendation', label: 'Send first recommendation request to a past customer with direct Nextdoor link' },
  { key: 'nd_first_post', label: 'Publish first helpful neighbor post — seasonal tip or recent job story' },
  { key: 'nd_search_verify', label: 'Confirm business shows up when searching the trade in their neighborhood on Nextdoor' },
]

const NEXTDOOR_TIPS = [
  'Post as a helpful neighbor not an advertiser — tips and stories outperform promotions',
  'Ask customers to recommend you on Nextdoor after every job — these resurface when neighbors ask for referrals',
  'Never post the same content repeatedly — Nextdoor flags repetitive posts quickly',
  'Respond to every recommendation publicly to show engagement',
  'Use real job photos from recognizable local streets when possible',
  'Limit direct promotional posts to once or twice per month maximum',
  'Reactive posts after storms or local events perform significantly better than scheduled content',
]

function NextdoorSetupSection({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [tipsOpen, setTipsOpen] = useState(false)

  const loadItems = useCallback(() => {
    fetch(`/api/gbp?clientId=${clientId}`)
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, boolean> = {}
        for (const item of data.items || []) {
          if (item.itemKey.startsWith('nd_')) {
            map[item.itemKey] = item.completed
          }
        }
        setItems(map)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  useEffect(() => { loadItems() }, [loadItems])

  const toggleItem = async (key: string) => {
    const newVal = !items[key]
    setItems((prev) => ({ ...prev, [key]: newVal }))
    await fetch('/api/gbp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, itemKey: key, completed: newVal }),
    })
  }

  const completedCount = NEXTDOOR_ITEMS.filter((i) => items[i.key]).length
  const pct = Math.round((completedCount / NEXTDOOR_ITEMS.length) * 100)

  return (
    <div className="bg-[#0E0C0A] rounded-xl border border-[rgba(193,123,42,0.15)] p-5 mb-4 text-left">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">🏘️</span>
        <h3 className="text-sm font-medium text-[#F2EDE4]">Nextdoor Business Page Setup</h3>
      </div>
      <p className="text-xs text-[#8A8070] mb-4">Complete these items to fully optimize this client on Nextdoor.</p>

      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 bg-[#1E1B16] rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: pct === 100 ? '#22c55e' : '#C17B2A' }}
          />
        </div>
        <span className="text-xs text-[#8A8070] shrink-0">{completedCount}/{NEXTDOOR_ITEMS.length}</span>
      </div>

      {/* Checklist */}
      {loading ? (
        <p className="text-xs text-[#8A8070]">Loading...</p>
      ) : (
        <div className="space-y-2 mb-4">
          {NEXTDOOR_ITEMS.map((item) => {
            const done = items[item.key] || false
            return (
              <label key={item.key} className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => toggleItem(item.key)}
                  className="mt-0.5 w-4 h-4 rounded border-[rgba(193,123,42,0.3)] bg-[#1E1B16] text-[#C17B2A] focus:ring-[#C17B2A] focus:ring-offset-0 cursor-pointer accent-[#C17B2A]"
                />
                <span className={`text-xs leading-relaxed ${done ? 'text-[#8A8070] line-through' : 'text-[#F2EDE4] group-hover:text-[#C17B2A]'} transition-colors`}>
                  {item.label}
                </span>
              </label>
            )
          })}
        </div>
      )}

      {/* Best Practices — collapsible */}
      <div className="border border-[rgba(193,123,42,0.1)] rounded-lg overflow-hidden mb-3">
        <button
          onClick={() => setTipsOpen(!tipsOpen)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[rgba(193,123,42,0.03)] transition-colors"
        >
          <span className="text-xs font-medium text-[#C17B2A]">Nextdoor Best Practices</span>
          <span className={`text-[#8A8070] text-[10px] transition-transform ${tipsOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>
        {tipsOpen && (
          <div className="px-4 pb-3 border-t border-[rgba(193,123,42,0.1)]">
            <ul className="space-y-1.5 mt-3">
              {NEXTDOOR_TIPS.map((tip, i) => (
                <li key={i} className="text-[11px] text-[#8A8070] leading-relaxed flex gap-2">
                  <span className="text-[#C17B2A] shrink-0">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Static note */}
      <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.1)] rounded-lg p-3">
        <p className="text-[11px] text-[#8A8070] leading-relaxed">
          Nextdoor recommendations work differently from Google reviews. They appear when neighbors search for trade
          recommendations and when others ask the community for referrals. One strong cluster of recommendations in a
          neighborhood can generate calls for months. Make getting Nextdoor recommendations part of the post-job routine
          for every client.
        </p>
      </div>
    </div>
  )
}
