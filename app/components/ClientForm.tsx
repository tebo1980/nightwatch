'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface BusinessHours {
  [day: string]: { open: boolean; start: string; close: string }
}

interface FormData {
  businessName: string
  agentName: string
  agentPersonality: string
  phoneNumber: string
  email: string
  website: string
  widgetColor: string
  greeting: string
  serviceArea: string
  emergencyAvail: boolean
  businessHours: BusinessHours
  jobTypes: string[]
  pricingRanges: Record<string, { low: number; high: number }>
  ghlWebhookUrl: string
  ghlApiKey: string
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const defaultHours: BusinessHours = {
  Monday: { open: true, start: '08:00', close: '17:00' },
  Tuesday: { open: true, start: '08:00', close: '17:00' },
  Wednesday: { open: true, start: '08:00', close: '17:00' },
  Thursday: { open: true, start: '08:00', close: '17:00' },
  Friday: { open: true, start: '08:00', close: '17:00' },
  Saturday: { open: true, start: '09:00', close: '13:00' },
  Sunday: { open: false, start: '09:00', close: '17:00' },
}

interface Props {
  initialData?: FormData & { id?: string; isActive?: boolean }
  isEdit?: boolean
}

export default function ClientForm({ initialData, isEdit }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null)
  const [jobInput, setJobInput] = useState('')
  const [testLeadStatus, setTestLeadStatus] = useState<string | null>(null)

  const [form, setForm] = useState<FormData>(
    initialData || {
      businessName: '',
      agentName: '',
      agentPersonality: '',
      phoneNumber: '',
      email: '',
      website: '',
      widgetColor: '#C17B2A',
      greeting: '',
      serviceArea: '',
      emergencyAvail: false,
      businessHours: { ...defaultHours },
      jobTypes: [],
      pricingRanges: {},
      ghlWebhookUrl: '',
      ghlApiKey: '',
    }
  )

  const set = (field: keyof FormData, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }))

  const addJobType = () => {
    const t = jobInput.trim()
    if (!t || form.jobTypes.includes(t)) return
    set('jobTypes', [...form.jobTypes, t])
    set('pricingRanges', { ...form.pricingRanges, [t]: { low: 0, high: 0 } })
    setJobInput('')
  }

  const removeJobType = (t: string) => {
    set('jobTypes', form.jobTypes.filter((j) => j !== t))
    const pr = { ...form.pricingRanges }
    delete pr[t]
    set('pricingRanges', pr)
  }

  const setPricing = (job: string, field: 'low' | 'high', val: number) => {
    set('pricingRanges', {
      ...form.pricingRanges,
      [job]: { ...form.pricingRanges[job], [field]: val },
    })
  }

  const setHours = (day: string, field: string, value: unknown) => {
    set('businessHours', {
      ...form.businessHours,
      [day]: { ...form.businessHours[day], [field]: value },
    })
  }

  const buildSystemPromptPreview = () => {
    const pricingText = Object.entries(form.pricingRanges)
      .map(([job, r]) => `- ${job}: $${r.low} - $${r.high}`)
      .join('\n')
    const hoursText = Object.entries(form.businessHours)
      .map(([day, h]) => `${day}: ${h.open ? `${h.start}-${h.close}` : 'Closed'}`)
      .join(', ')
    return `You are ${form.agentName}, a friendly and professional virtual assistant for ${form.businessName}.\n\nService Area: ${form.serviceArea}\nPhone: ${form.phoneNumber}\nEmail: ${form.email}\nHours: ${hoursText}\nEmergency: ${form.emergencyAvail ? '24/7' : 'Not available'}\n\nPersonality: ${form.agentPersonality}\n\nServices: ${form.jobTypes.join(', ')}\nPricing:\n${pricingText}`
  }

  const embedCode = `<script>
window.NightwatchConfig = {
  clientId: "${initialData?.id || '[GENERATED_ID]'}",
  agentName: "${form.agentName}",
  businessName: "${form.businessName}",
  widgetColor: "${form.widgetColor}",
  apiUrl: "https://nightwatch.baratrust.com/api/chat",
  greeting: "${form.greeting || `Hi! I'm ${form.agentName} from ${form.businessName}. How can I help you today?`}"
}
<\/script>
<script src="https://nightwatch.baratrust.com/nightwatch-widget.js" async><\/script>`

  const testWebhook = async () => {
    if (!form.ghlWebhookUrl) return
    setWebhookStatus('testing')
    try {
      const res = await fetch(form.ghlWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Test',
          lastName: 'Lead',
          phone: '555-0100',
          email: 'test@nightwatch.dev',
          source: 'BaraTrust Nightwatch Test',
          tags: ['nightwatch-test'],
        }),
      })
      setWebhookStatus(res.ok ? 'success' : 'failed')
    } catch {
      setWebhookStatus('failed')
    }
  }

  const save = async () => {
    setSaving(true)
    const hoursJson: Record<string, string> = {}
    for (const [day, h] of Object.entries(form.businessHours)) {
      hoursJson[day] = h.open ? `${h.start}-${h.close}` : 'Closed'
    }
    const pricingJson: Record<string, string> = {}
    for (const [job, r] of Object.entries(form.pricingRanges)) {
      pricingJson[job] = `$${r.low} - $${r.high}`
    }

    const payload = {
      businessName: form.businessName,
      agentName: form.agentName,
      agentPersonality: form.agentPersonality,
      phoneNumber: form.phoneNumber,
      email: form.email,
      website: form.website || null,
      widgetColor: form.widgetColor,
      greeting: form.greeting || `Hi! I'm ${form.agentName} from ${form.businessName}. How can I help you today?`,
      serviceArea: form.serviceArea,
      emergencyAvail: form.emergencyAvail,
      businessHours: JSON.stringify(hoursJson),
      jobTypes: JSON.stringify(form.jobTypes),
      pricingRanges: JSON.stringify(pricingJson),
      ghlWebhookUrl: form.ghlWebhookUrl || null,
      ghlApiKey: form.ghlApiKey || null,
      isActive: initialData?.isActive ?? true,
    }

    try {
      const url = isEdit ? `/api/clients/${initialData?.id}` : '/api/clients'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        router.refresh()
        router.push('/')
      } else {
        const data = await res.json().catch(() => ({}))
        console.error('Save failed:', res.status, data)
        alert(`Save failed: ${data.error || res.statusText}`)
      }
    } catch (err) {
      console.error('Save error:', err)
      alert('Network error — could not reach the server.')
    } finally {
      setSaving(false)
    }
  }

  const deactivate = async () => {
    if (!confirm('Are you sure you want to deactivate this client? Their chat widget will stop working.')) return
    try {
      await fetch(`/api/clients/${initialData?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          isActive: false,
          businessHours: JSON.stringify({}),
          jobTypes: JSON.stringify(form.jobTypes),
          pricingRanges: JSON.stringify({}),
        }),
      })
      router.push('/')
    } catch (err) {
      console.error('Deactivate error:', err)
    }
  }


  const sendTestLead = async () => {
    if (!form.ghlWebhookUrl) {
      setTestLeadStatus('no-url')
      setTimeout(() => setTestLeadStatus(null), 3000)
      return
    }
    setTestLeadStatus('sending')
    try {
      const res = await fetch(form.ghlWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Test',
          lastName: 'Lead',
          email: 'test@nightwatch.baratrust.com',
          phone: '502-555-0000',
          city: 'New Albany',
          source: 'BaraTrust Nightwatch — Test',
          tags: ['nightwatch', 'test-lead'],
          customField: {
            job_type: 'Water Heater Replacement',
            job_description: 'TEST LEAD — Customer reported water heater making banging noise',
            urgency: 'soon',
            quote_range: '$800 - $1,400',
            best_time_to_call: 'Mornings',
            conversation_summary: 'TEST LEAD — This is a test from the BaraTrust Nightwatch admin to verify your GHL integration is working correctly.',
            source_business: form.businessName,
          },
        }),
      })
      setTestLeadStatus(res.ok ? 'success' : 'failed')
    } catch {
      setTestLeadStatus('failed')
    }
    setTimeout(() => setTestLeadStatus(null), 4000)
  }
  const inputCls = 'w-full bg-[#161410] border border-[rgba(193,123,42,0.15)] rounded-lg px-4 py-3 text-[#F2EDE4] text-sm outline-none focus:border-[#C17B2A] transition-colors'
  const labelCls = 'block text-sm text-[#8A8070] mb-1.5'
  const btnPrimary = 'bg-[#C17B2A] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-50'
  const btnSecondary = 'border border-[rgba(193,123,42,0.3)] text-[#C17B2A] px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[rgba(193,123,42,0.1)] transition-colors'

  const steps = ['Business Basics', 'Service Area & Hours', 'Services & Pricing', 'CRM Integration', 'Review & Generate']

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-[#F2EDE4] mb-1">
          {isEdit ? 'Edit Client' : 'New Client'}
        </h1>
        <p className="text-sm text-[#8A8070] mb-8">
          {isEdit ? 'Update agent configuration' : 'Set up a new AI sales agent'}
        </p>

        {/* Step indicator */}
        <div className="flex gap-1 mb-8">
          {steps.map((label, i) => (
            <button
              key={i}
              onClick={() => setStep(i + 1)}
              className={`flex-1 text-center py-2 text-xs rounded-md transition-colors ${
                step === i + 1
                  ? 'bg-[#C17B2A] text-white'
                  : step > i + 1
                  ? 'bg-[rgba(193,123,42,0.2)] text-[#C17B2A]'
                  : 'bg-[#1E1B16] text-[#8A8070]'
              }`}
            >
              <span className="hidden sm:inline">{i + 1}. {label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </button>
          ))}
        </div>

        {/* Steps content */}
        <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-6 space-y-5">
          {step === 1 && (
            <>
              <div>
                <label className={labelCls}>Business Name *</label>
                <input className={inputCls} value={form.businessName} onChange={(e) => set('businessName', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Agent Name *</label>
                <input className={inputCls} placeholder="e.g. Aria, Alex, Jordan" value={form.agentName} onChange={(e) => set('agentName', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Agent Personality *</label>
                <textarea className={inputCls + ' h-24 resize-none'} placeholder="e.g. Warm and professional. Uses first names. Gets to the point. Never makes customers feel dumb." value={form.agentPersonality} onChange={(e) => set('agentPersonality', e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Business Phone *</label>
                  <input type="tel" className={inputCls} value={form.phoneNumber} onChange={(e) => set('phoneNumber', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Business Email *</label>
                  <input type="email" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Website URL</label>
                <input className={inputCls} placeholder="https://" value={form.website} onChange={(e) => set('website', e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Widget Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={form.widgetColor} onChange={(e) => set('widgetColor', e.target.value)} className="w-10 h-10 rounded border-0 cursor-pointer bg-transparent" />
                    <input className={inputCls} value={form.widgetColor} onChange={(e) => set('widgetColor', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Custom Greeting</label>
                  <input className={inputCls} placeholder={`Hi! I'm ${form.agentName || 'Aria'} from ${form.businessName || '[Business]'}. How can I help you today?`} value={form.greeting} onChange={(e) => set('greeting', e.target.value)} />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className={labelCls}>Service Area *</label>
                <textarea className={inputCls + ' h-24 resize-none'} placeholder="New Albany IN, Louisville KY, Jeffersonville IN — list all cities and zip codes you serve" value={form.serviceArea} onChange={(e) => set('serviceArea', e.target.value)} />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => set('emergencyAvail', !form.emergencyAvail)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${form.emergencyAvail ? 'bg-[#C17B2A]' : 'bg-[#3A3530]'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${form.emergencyAvail ? 'left-[26px]' : 'left-0.5'}`} />
                </button>
                <label className="text-sm text-[#F2EDE4]">Emergency Service Available (24/7)</label>
              </div>
              <div>
                <label className={labelCls}>Business Hours</label>
                <div className="space-y-2 mt-2">
                  {DAYS.map((day) => {
                    const h = form.businessHours[day]
                    return (
                      <div key={day} className="flex items-center gap-3 flex-wrap">
                        <span className="w-24 text-sm text-[#F2EDE4]">{day}</span>
                        <button
                          type="button"
                          onClick={() => setHours(day, 'open', !h.open)}
                          className={`w-10 h-5 rounded-full transition-colors relative ${h.open ? 'bg-[#C17B2A]' : 'bg-[#3A3530]'}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${h.open ? 'left-[22px]' : 'left-0.5'}`} />
                        </button>
                        {h.open ? (
                          <div className="flex items-center gap-2">
                            <input type="time" className={inputCls + ' !w-32 !py-1.5 text-xs'} value={h.start} onChange={(e) => setHours(day, 'start', e.target.value)} />
                            <span className="text-[#8A8070] text-xs">to</span>
                            <input type="time" className={inputCls + ' !w-32 !py-1.5 text-xs'} value={h.close} onChange={(e) => setHours(day, 'close', e.target.value)} />
                          </div>
                        ) : (
                          <span className="text-sm text-[#8A8070]">Closed</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className={labelCls}>Job Types</label>
                <div className="flex gap-2 mb-3">
                  <input
                    className={inputCls}
                    placeholder='e.g. "Water Heater Replacement" — press Enter to add'
                    value={jobInput}
                    onChange={(e) => setJobInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addJobType() } }}
                  />
                  <button type="button" onClick={addJobType} className={btnSecondary + ' shrink-0'}>Add</button>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {form.jobTypes.map((t) => (
                    <span key={t} className="bg-[rgba(193,123,42,0.15)] text-[#C17B2A] px-3 py-1 rounded-full text-sm flex items-center gap-1.5">
                      {t}
                      <button type="button" onClick={() => removeJobType(t)} className="text-[#C17B2A] hover:text-white">&times;</button>
                    </span>
                  ))}
                </div>
              </div>
              {form.jobTypes.length > 0 && (
                <div>
                  <label className={labelCls}>Pricing Ranges</label>
                  <p className="text-xs text-[#8A8070] mb-3">Give realistic ranges. The agent will always say &quot;typically&quot; and note that exact quotes require an assessment.</p>
                  <div className="space-y-3">
                    {form.jobTypes.map((job) => (
                      <div key={job} className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm text-[#F2EDE4] w-48 truncate">{job}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[#8A8070] text-sm">$</span>
                          <input type="number" className={inputCls + ' !w-28 !py-1.5'} value={form.pricingRanges[job]?.low || ''} onChange={(e) => setPricing(job, 'low', Number(e.target.value))} />
                          <span className="text-[#8A8070] text-sm">-</span>
                          <span className="text-[#8A8070] text-sm">$</span>
                          <input type="number" className={inputCls + ' !w-28 !py-1.5'} value={form.pricingRanges[job]?.high || ''} onChange={(e) => setPricing(job, 'high', Number(e.target.value))} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <div>
                <label className={labelCls}>Go High Level Webhook URL</label>
                <p className="text-xs text-[#8A8070] mb-2">Found in GHL under Settings &gt; Integrations &gt; Webhooks</p>
                <input className={inputCls} placeholder="https://services.leadconnectorhq.com/hooks/..." value={form.ghlWebhookUrl} onChange={(e) => set('ghlWebhookUrl', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Go High Level API Key</label>
                <input className={inputCls} value={form.ghlApiKey} onChange={(e) => set('ghlApiKey', e.target.value)} />
              </div>
              {form.ghlWebhookUrl && (
                <div>
                  <button type="button" onClick={testWebhook} className={btnSecondary}>
                    {webhookStatus === 'testing' ? 'Testing...' : 'Test Webhook'}
                  </button>
                  {webhookStatus === 'success' && <span className="ml-3 text-sm text-green-400">Webhook sent successfully!</span>}
                  {webhookStatus === 'failed' && <span className="ml-3 text-sm text-red-400">Webhook failed - check the URL</span>}
                </div>
              )}
              <p className="text-xs text-[#8A8070]">GHL integration can be added or updated later.</p>
            </>
          )}

          {step === 5 && (
            <>
              <div>
                <details className="group">
                  <summary className="text-sm text-[#C17B2A] cursor-pointer hover:underline">View System Prompt Preview</summary>
                  <pre className="mt-3 bg-[#161410] rounded-lg p-4 text-xs text-[#8A8070] overflow-x-auto whitespace-pre-wrap border border-[rgba(193,123,42,0.1)]">{buildSystemPromptPreview()}</pre>
                </details>
              </div>
              <div>
                <label className={labelCls}>Embed Code</label>
                <div className="relative">
                  <pre className="bg-[#161410] rounded-lg p-4 text-xs text-[#8A8070] overflow-x-auto whitespace-pre-wrap border border-[rgba(193,123,42,0.1)]">{embedCode}</pre>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(embedCode) }}
                    className="absolute top-2 right-2 text-xs bg-[#C17B2A] text-white px-3 py-1 rounded hover:bg-[#D4892F] transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <div>
            {step > 1 && (
              <button type="button" onClick={() => setStep(step - 1)} className={btnSecondary}>Back</button>
            )}
          </div>
          <div className="flex gap-3">
            {step < 5 ? (
              <button type="button" onClick={() => setStep(step + 1)} className={btnPrimary}>Next</button>
            ) : (
              <button type="button" onClick={save} disabled={saving} className={btnPrimary}>
                {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save & Activate'}
              </button>
            )}
          </div>
        </div>

        {/* Send Test Lead */}        {isEdit && (          <div className="mt-8 bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-6">            <h3 className="text-sm font-medium text-[#F2EDE4] mb-2">Test GHL Integration</h3>            <p className="text-xs text-[#8A8070] mb-4">Send a test lead to verify Go High Level is receiving data correctly.</p>            <button type="button" onClick={sendTestLead} disabled={testLeadStatus === 'sending'} className={btnSecondary}>              {testLeadStatus === 'sending' ? 'Sending...' : 'Send Test Lead'}            </button>            {testLeadStatus === 'success' && <span className="ml-3 text-sm text-green-400">Test lead sent to Go High Level</span>}            {testLeadStatus === 'failed' && <span className="ml-3 text-sm text-red-400">Failed to send — check the webhook URL</span>}            {testLeadStatus === 'no-url' && <span className="ml-3 text-sm text-yellow-400">No GHL webhook URL configured</span>}          </div>        )}        {/* Danger zone for edit */}
        {isEdit && (
          <div className="mt-12 border border-red-900/30 rounded-xl p-6">
            <h3 className="text-red-400 text-sm font-medium mb-2">Danger Zone</h3>
            <p className="text-xs text-[#8A8070] mb-4">Deactivating this client will disable their chat widget immediately.</p>
            <button type="button" onClick={deactivate} className="bg-red-900/30 text-red-400 px-4 py-2 rounded-lg text-sm hover:bg-red-900/50 transition-colors">
              Deactivate Client
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
