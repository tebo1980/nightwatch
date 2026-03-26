'use client'

import { useState } from 'react'

// ─── Styles (purple accent) ─────────────────────────────────────────

const card = 'bg-[#1E1B16] rounded-xl border border-[rgba(124,58,237,0.15)]'
const inputClass = 'bg-[#1E1B16] border border-[rgba(124,58,237,0.3)] text-[#F2EDE4] px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#7C3AED] w-full'
const btnPrimary = 'bg-[#7C3AED] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#8B5CF6] transition-colors disabled:opacity-50'
const btnSecondary = 'border border-[rgba(124,58,237,0.3)] text-[#7C3AED] px-4 py-2 rounded-lg text-sm hover:bg-[rgba(124,58,237,0.1)] transition-colors disabled:opacity-50'

const DATA_TYPE_OPTIONS = [
  { key: 'invoices', label: 'Invoices / Revenue' },
  { key: 'ad_spend', label: 'Ad Spend' },
  { key: 'leads', label: 'Lead Records' },
  { key: 'expenses', label: 'Expense Records' },
  { key: 'customers', label: 'Customer Records' },
  { key: 'jobs', label: 'Job Records' },
]

const TRADE_OPTIONS = [
  'Plumber', 'Electrician', 'HVAC', 'General Contractor', 'Roofer', 'Painter',
  'Landscaper', 'Pest Control', 'Cleaning Service', 'Restaurant', 'Auto Repair',
  'Handyman', 'Flooring', 'Concrete', 'Fencing', 'Moving Company', 'Other',
]

const REVENUE_RANGES = [
  'Under $100K', '$100K - $250K', '$250K - $500K', '$500K - $1M', '$1M - $2.5M', '$2.5M+',
]

export default function MemoriaOnboard() {
  const [step, setStep] = useState(1)

  // Step 1 — Business basics
  const [businessName, setBusinessName] = useState('')
  const [tradeType, setTradeType] = useState('')
  const [yearsInBusiness, setYearsInBusiness] = useState('')
  const [annualRevenue, setAnnualRevenue] = useState('')
  const [employees, setEmployees] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  // Step 2 — Historical data
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [dataEntries, setDataEntries] = useState<Record<string, string>>({})

  // Step 3 — Goals
  const [challenge, setChallenge] = useState('')
  const [decision, setDecision] = useState('')
  const [success, setSuccess] = useState('')

  // State
  const [processing, setProcessing] = useState(false)
  const [clientSlug, setClientSlug] = useState('')
  const [insightsCount, setInsightsCount] = useState(0)
  const [error, setError] = useState('')

  const canStep1 = businessName && tradeType && ownerName && ownerEmail
  const canStep2 = selectedTypes.length > 0 && selectedTypes.every((t) => dataEntries[t]?.trim())

  const toggleType = (key: string) => {
    setSelectedTypes((prev) => prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key])
  }

  const processOnboarding = async () => {
    setProcessing(true)
    setError('')

    try {
      // 1. Create the standalone client
      const createRes = await fetch('/api/memoria/standalone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          industry: tradeType,
          ownerName,
          ownerFirstName: ownerName.split(' ')[0],
          ownerEmail,
          contactPhone,
          city: 'Louisville',
          state: 'KY',
          yearsInBusiness,
          annualRevenue,
          employees,
        }),
      })
      const createData = await createRes.json()
      if (createData.error) { setError(createData.error); setProcessing(false); return }

      const newClientId = createData.client.id
      const newSlug = createData.slug
      setClientSlug(newSlug)

      // 2. Save goals
      if (challenge || decision || success) {
        await fetch('/api/memoria/standalone', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: newClientId,
            memoriaGoals: JSON.stringify({ challenge, decision, success }),
          }),
        })
      }

      // 3. Process each data type
      let totalInsights = 0
      const now = new Date()
      const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1)

      for (const dataType of selectedTypes) {
        const rawData = dataEntries[dataType]
        if (!rawData?.trim()) continue

        try {
          const intakeRes = await fetch('/api/memoria/intake', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientId: newClientId,
              dataType,
              periodStart: twelveMonthsAgo.toISOString().split('T')[0],
              periodEnd: now.toISOString().split('T')[0],
              rawData,
              clientTrade: tradeType,
            }),
          })
          const intakeData = await intakeRes.json()
          totalInsights += intakeData.insightsCreated || 0
        } catch { /* continue with other types */ }
      }

      setInsightsCount(totalInsights)

      // 4. Mark intake completed
      await fetch('/api/memoria/standalone', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: newClientId, intakeCompleted: true }),
      })

      setStep(5) // Jump to done
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setProcessing(false)
  }

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 text-[#7C3AED] text-xs font-medium mb-3">
            <span className="text-lg">🧠</span> MEMORIA INTELLIGENCE
          </div>
          <h1 className="text-2xl font-semibold text-[#F2EDE4]">Welcome to Memoria</h1>
          <p className="text-sm text-[#8A8070] mt-1">Your business intelligence system starts learning today.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s ? 'bg-[#7C3AED] text-white'
                  : step > s ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-[#1E1B16] text-[#8A8070] border border-[rgba(124,58,237,0.15)]'
              }`}>{step > s ? '✓' : s}</div>
              {s < 5 && <div className={`w-8 h-px ${step > s ? 'bg-green-500/30' : 'bg-[rgba(124,58,237,0.15)]'}`} />}
            </div>
          ))}
        </div>

        {/* STEP 1 — Business Basics */}
        {step === 1 && (
          <div className={card + ' p-6 space-y-5'}>
            <h2 className="text-lg font-medium text-[#F2EDE4]">Tell us about your business</h2>

            <div>
              <label className="text-xs text-[#8A8070] mb-2 block">Business Name *</label>
              <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={inputClass} placeholder="e.g. Smith Plumbing LLC" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#8A8070] mb-2 block">Owner Name *</label>
                <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className={inputClass} placeholder="John Smith" />
              </div>
              <div>
                <label className="text-xs text-[#8A8070] mb-2 block">Email *</label>
                <input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} className={inputClass} placeholder="john@example.com" />
              </div>
            </div>

            <div>
              <label className="text-xs text-[#8A8070] mb-2 block">Phone</label>
              <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputClass} placeholder="(502) 555-0123" />
            </div>

            <div>
              <label className="text-xs text-[#8A8070] mb-2 block">Trade / Business Type *</label>
              <select value={tradeType} onChange={(e) => setTradeType(e.target.value)} className={inputClass}>
                <option value="">Select your trade...</option>
                {TRADE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-[#8A8070] mb-2 block">Years in Business</label>
                <input value={yearsInBusiness} onChange={(e) => setYearsInBusiness(e.target.value)} className={inputClass} placeholder="e.g. 8" />
              </div>
              <div>
                <label className="text-xs text-[#8A8070] mb-2 block">Annual Revenue</label>
                <select value={annualRevenue} onChange={(e) => setAnnualRevenue(e.target.value)} className={inputClass}>
                  <option value="">Select...</option>
                  {REVENUE_RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#8A8070] mb-2 block">Employees</label>
                <input value={employees} onChange={(e) => setEmployees(e.target.value)} className={inputClass} placeholder="e.g. 5" />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setStep(2)} disabled={!canStep1} className={btnPrimary}>Next: Upload Data →</button>
            </div>
          </div>
        )}

        {/* STEP 2 — Historical Data */}
        {step === 2 && (
          <div className="space-y-6">
            <div className={card + ' p-6'}>
              <h2 className="text-lg font-medium text-[#F2EDE4] mb-2">Upload Historical Data</h2>
              <p className="text-xs text-[#8A8070] mb-4">
                Select data types you have available and paste up to 12 months of data. The more data you provide, the smarter your intelligence will be.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {DATA_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => toggleType(opt.key)}
                    className={`p-3 rounded-lg text-sm text-left transition-colors border ${
                      selectedTypes.includes(opt.key)
                        ? 'bg-[#7C3AED]/10 border-[#7C3AED] text-[#7C3AED]'
                        : 'bg-[#0E0C0A] border-[rgba(124,58,237,0.15)] text-[#8A8070] hover:border-[rgba(124,58,237,0.3)]'
                    }`}
                  >
                    <span className="mr-2">{selectedTypes.includes(opt.key) ? '☑' : '☐'}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {selectedTypes.map((typeKey) => {
              const label = DATA_TYPE_OPTIONS.find((o) => o.key === typeKey)?.label || typeKey
              return (
                <div key={typeKey} className={card + ' p-6'}>
                  <label className="text-sm font-medium text-[#F2EDE4] mb-2 block">Paste your {label} data here</label>
                  <p className="text-xs text-[#8A8070] mb-3">Any format is fine. Include dates, amounts, and descriptions where possible.</p>
                  <textarea
                    value={dataEntries[typeKey] || ''}
                    onChange={(e) => setDataEntries((prev) => ({ ...prev, [typeKey]: e.target.value }))}
                    className={inputClass + ' min-h-[160px] font-mono text-xs'}
                    placeholder={`Paste ${label.toLowerCase()} data — CSV, JSON, plain text, anything...`}
                  />
                </div>
              )
            })}

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className={btnSecondary}>← Back</button>
              <button onClick={() => setStep(3)} disabled={!canStep2} className={btnPrimary}>Next: Your Goals →</button>
            </div>
          </div>
        )}

        {/* STEP 3 — Current Situation & Goals */}
        {step === 3 && (
          <div className={card + ' p-6 space-y-5'}>
            <h2 className="text-lg font-medium text-[#F2EDE4]">Help Memoria understand your goals</h2>
            <p className="text-xs text-[#8A8070]">
              These answers help Memoria give you advice that is specific to where you are and where you want to go.
            </p>

            <div>
              <label className="text-xs text-[#8A8070] mb-2 block">What is your biggest business challenge right now?</label>
              <textarea value={challenge} onChange={(e) => setChallenge(e.target.value)} className={inputClass + ' min-h-[100px]'}
                placeholder="e.g. I can't find reliable technicians, my cost per lead keeps going up, cash flow is tight in winter months..." />
            </div>

            <div>
              <label className="text-xs text-[#8A8070] mb-2 block">What decision are you trying to make in the next 90 days?</label>
              <textarea value={decision} onChange={(e) => setDecision(e.target.value)} className={inputClass + ' min-h-[100px]'}
                placeholder="e.g. Whether to hire another technician, whether to increase ad spend, whether to expand into a new service area..." />
            </div>

            <div>
              <label className="text-xs text-[#8A8070] mb-2 block">What does success look like for your business in 12 months?</label>
              <textarea value={success} onChange={(e) => setSuccess(e.target.value)} className={inputClass + ' min-h-[100px]'}
                placeholder="e.g. $80K/month revenue, 3 trucks running, 4.8 star rating, 50+ reviews on Google..." />
            </div>

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(2)} className={btnSecondary}>← Back</button>
              <button onClick={() => setStep(4)} className={btnPrimary}>Next: Review →</button>
            </div>
          </div>
        )}

        {/* STEP 4 — Confirmation */}
        {step === 4 && (
          <div className={card + ' p-8 text-center'}>
            <h2 className="text-lg font-medium text-[#F2EDE4] mb-4">Ready to Launch Memoria</h2>

            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6 text-left">
              <div className={card + ' p-3'}>
                <div className="text-xs text-[#8A8070]">Business</div>
                <div className="text-sm text-[#F2EDE4]">{businessName}</div>
              </div>
              <div className={card + ' p-3'}>
                <div className="text-xs text-[#8A8070]">Trade</div>
                <div className="text-sm text-[#F2EDE4]">{tradeType}</div>
              </div>
              <div className={card + ' p-3'}>
                <div className="text-xs text-[#8A8070]">Data Types</div>
                <div className="text-sm text-[#F2EDE4]">{selectedTypes.length} submitted</div>
              </div>
              <div className={card + ' p-3'}>
                <div className="text-xs text-[#8A8070]">Goals</div>
                <div className="text-sm text-[#F2EDE4]">{[challenge, decision, success].filter(Boolean).length} of 3</div>
              </div>
            </div>

            <p className="text-xs text-[#8A8070] mb-2">⏱️ Estimated time to first Intelligence Brief: <span className="text-[#F2EDE4]">24 hours</span></p>
            <p className="text-xs text-[#8A8070] mb-6">📧 Your portal link will be emailed to <span className="text-[#F2EDE4]">{ownerEmail}</span></p>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <button onClick={processOnboarding} disabled={processing} className={btnPrimary + ' text-base px-8 py-3'}>
              {processing ? '🧠 Processing Your Data...' : '🚀 Launch Memoria'}
            </button>

            <div className="mt-4">
              <button onClick={() => setStep(3)} disabled={processing} className={btnSecondary}>← Back</button>
            </div>
          </div>
        )}

        {/* STEP 5 — Done */}
        {step === 5 && (
          <div className={card + ' p-8 text-center'}>
            <div className="text-5xl mb-4">🧠</div>
            <h2 className="text-xl font-semibold text-[#F2EDE4] mb-2">Welcome to Memoria</h2>
            <p className="text-sm text-[#8A8070] max-w-md mx-auto mb-6">
              Your business intelligence system is now learning your business.
              Your first Intelligence Brief will be ready within 24 hours.
            </p>

            {insightsCount > 0 && (
              <div className="mb-6">
                <div className="text-3xl font-semibold text-[#7C3AED]">{insightsCount}</div>
                <div className="text-xs text-[#8A8070]">Insights generated from your data</div>
              </div>
            )}

            {clientSlug && (
              <div className={card + ' p-4 max-w-md mx-auto mb-6'}>
                <div className="text-xs text-[#8A8070] mb-1">Your Memoria Portal</div>
                <div className="text-sm text-[#7C3AED] font-mono break-all">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/memoria/portal/{clientSlug}
                </div>
              </div>
            )}

            <p className="text-xs text-[#8A8070]">
              Bookmark your portal link. You can upload new data and view your intelligence anytime.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
