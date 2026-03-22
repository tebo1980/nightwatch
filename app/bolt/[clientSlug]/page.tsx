'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'

// ─── Types ──────────────────────────────────────────────────────────

interface BoltConfig {
  id: string
  clientId: string
  clientSlug: string
  businessName: string
  businessPhone: string
  businessEmail: string
  businessAddress: string | null
  trade: string
  laborRatePerHour: number
  minimumJobSize: number
  taxRate: number
  paymentTerms: string
  warrantyTerms: string
  validityDays: number
  escalationClause: boolean
}

interface AtlasMaterial {
  id: string
  materialName: string
  unit: string
  currentPrice: number
}

interface SelectedMaterial {
  id: string
  name: string
  unit: string
  unitPrice: number
  quantity: number
  isCustom?: boolean
}

// ─── Job type lists per trade ───────────────────────────────────────

const JOB_TYPES: Record<string, string[]> = {
  Plumber: ['Water Heater Replacement', 'Leak Repair', 'Drain Cleaning', 'Fixture Installation', 'Pipe Repair', 'Full Repipe', 'Other'],
  Roofer: ['Full Replacement', 'Partial Repair', 'Leak Repair', 'Gutter Work', 'Storm Damage', 'Other'],
  HVAC: ['AC Installation', 'Furnace Installation', 'AC Repair', 'Furnace Repair', 'Tune-Up', 'Duct Work', 'Other'],
  Electrician: ['Panel Upgrade', 'Outlet Installation', 'Wiring', 'Lighting', 'EV Charger', 'Troubleshooting', 'Other'],
  'General Contractor': ['Addition', 'Remodel', 'Framing', 'Drywall', 'Flooring', 'Siding', 'Other'],
  Painter: ['Interior Painting', 'Exterior Painting', 'Cabinet Painting', 'Deck Staining', 'Touch-Up', 'Other'],
  Landscaper: ['Lawn Installation', 'Mulching', 'Plant Installation', 'Irrigation', 'Cleanup', 'Design', 'Other'],
  Handyman: ['General Repair', 'Door/Window', 'Plumbing Repair', 'Electrical Repair', 'Assembly', 'Other'],
  'Deck Builder': ['New Deck', 'Deck Repair', 'Deck Refinishing', 'Pergola', 'Fence', 'Other'],
  Concrete: ['Driveway', 'Patio', 'Sidewalk', 'Foundation Repair', 'Flatwork', 'Stamped Concrete', 'Other'],
}

// ─── Helpers ────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Component ──────────────────────────────────────────────────────

export default function ContractorBoltView() {
  const params = useParams()
  const clientSlug = params.clientSlug as string

  // Config loading
  const [config, setConfig] = useState<BoltConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Step navigation
  const [step, setStep] = useState(1)

  // Step 1 — Customer info
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')

  // Step 2 — Job details
  const [jobType, setJobType] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [laborHours, setLaborHours] = useState(2)

  // Step 3 — Materials
  const [materials, setMaterials] = useState<AtlasMaterial[]>([])
  const [materialsLoading, setMaterialsLoading] = useState(false)
  const [materialSearch, setMaterialSearch] = useState('')
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterial[]>([])
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customQty, setCustomQty] = useState(1)
  const [customUnit, setCustomUnit] = useState('each')
  const [customPrice, setCustomPrice] = useState(0)

  // Saving
  const [saving, setSaving] = useState(false)
  const [savedEstimate, setSavedEstimate] = useState<{ estimateNumber: string } | null>(null)

  // ─── Load config ────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/bolt/config')
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

  // ─── Load materials when reaching step 3 ─────────────────────────

  const loadMaterials = useCallback(() => {
    if (!config || materials.length > 0) return
    setMaterialsLoading(true)
    fetch(`/api/atlas/prices-by-trade?trade=${encodeURIComponent(config.trade)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMaterials(data)
      })
      .catch(() => {})
      .finally(() => setMaterialsLoading(false))
  }, [config, materials.length])

  useEffect(() => {
    if (step === 3) loadMaterials()
  }, [step, loadMaterials])

  // ─── Calculated values ──────────────────────────────────────────

  const laborRate = config?.laborRatePerHour ?? 75
  const laborTotal = laborHours * laborRate
  const materialsTotal = selectedMaterials.reduce((s, m) => s + m.unitPrice * m.quantity, 0)
  const subtotal = laborTotal + materialsTotal
  const taxAmount = config?.taxRate ? subtotal * (config.taxRate / 100) : 0
  const totalAmount = subtotal + taxAmount
  const depositRequired = Math.round(totalAmount * 50) / 100

  // ─── Material actions ───────────────────────────────────────────

  function addMaterial(mat: AtlasMaterial) {
    if (selectedMaterials.some((m) => m.id === mat.id)) return
    setSelectedMaterials((prev) => [...prev, {
      id: mat.id,
      name: mat.materialName,
      unit: mat.unit,
      unitPrice: mat.currentPrice,
      quantity: 1,
    }])
  }

  function removeMaterial(id: string) {
    setSelectedMaterials((prev) => prev.filter((m) => m.id !== id))
  }

  function updateQty(id: string, delta: number) {
    setSelectedMaterials((prev) => prev.map((m) =>
      m.id === id ? { ...m, quantity: Math.max(1, m.quantity + delta) } : m
    ))
  }

  function setQty(id: string, qty: number) {
    setSelectedMaterials((prev) => prev.map((m) =>
      m.id === id ? { ...m, quantity: Math.max(1, qty) } : m
    ))
  }

  function addCustomMaterial() {
    if (!customName || customPrice <= 0) return
    setSelectedMaterials((prev) => [...prev, {
      id: `custom-${Date.now()}`,
      name: customName,
      unit: customUnit,
      unitPrice: customPrice,
      quantity: customQty,
      isCustom: true,
    }])
    setCustomName('')
    setCustomQty(1)
    setCustomUnit('each')
    setCustomPrice(0)
    setShowCustomForm(false)
  }

  // ─── Save estimate ─────────────────────────────────────────────

  async function saveEstimate(status: 'draft' | 'sent') {
    if (!config) return
    setSaving(true)
    try {
      const res = await fetch('/api/bolt/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: config.clientId,
          customerName,
          customerPhone,
          customerEmail,
          customerAddress,
          jobType,
          jobDescription,
          lineItems: selectedMaterials.map((m) => ({
            name: m.name, unit: m.unit, unitPrice: m.unitPrice, quantity: m.quantity, total: m.unitPrice * m.quantity,
          })),
          laborHours,
          laborRate,
          laborTotal,
          materialsTotal,
          subtotal,
          taxAmount,
          totalAmount,
          depositRequired,
        }),
      })
      const data = await res.json()
      if (res.ok && data.estimate) {
        if (status === 'sent') {
          await fetch('/api/bolt/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estimateId: data.estimate.id, method: 'email' }),
          })
        }
        setSavedEstimate(data.estimate)
      }
    } catch {
      // handled by UI
    } finally {
      setSaving(false)
    }
  }

  // ─── Filtered materials ─────────────────────────────────────────

  const filteredMaterials = materials.filter((m) => {
    if (!materialSearch) return true
    return m.materialName.toLowerCase().includes(materialSearch.toLowerCase())
  })

  // ─── Loading / Error states ─────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#C17B2A] text-3xl mb-3">&#9889;</div>
          <p className="text-[#8A8070] text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (notFound || !config) {
    return (
      <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-[#8A8070] text-4xl mb-4">&#9889;</div>
          <h1 className="text-lg font-semibold text-[#F2EDE4] mb-3">This estimate link is not active.</h1>
          <p className="text-sm text-[#8A8070]">Please contact your BaraTrust representative.</p>
        </div>
      </div>
    )
  }

  // ─── Success state ──────────────────────────────────────────────

  if (savedEstimate) {
    return (
      <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">&#9989;</div>
          <h1 className="text-lg font-semibold text-[#F2EDE4] mb-2">Estimate Saved</h1>
          <p className="text-sm text-[#8A8070] mb-1">Estimate #{savedEstimate.estimateNumber}</p>
          <p className="text-sm text-[#8A8070] mb-6">${fmt(totalAmount)}</p>
          <button
            onClick={() => {
              setSavedEstimate(null)
              setStep(1)
              setCustomerName('')
              setCustomerPhone('')
              setCustomerEmail('')
              setCustomerAddress('')
              setJobType('')
              setJobDescription('')
              setLaborHours(2)
              setSelectedMaterials([])
              setMaterialSearch('')
            }}
            className="bg-[#C17B2A] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-[#D4892F] transition-colors"
          >
            Create Another Estimate
          </button>
        </div>
      </div>
    )
  }

  // ─── Step labels ────────────────────────────────────────────────

  const STEPS = ['Customer', 'Job', 'Materials', 'Review']

  return (
    <div className="min-h-screen bg-[#0E0C0A] pb-24">
      {/* Header */}
      <div className="bg-[#1E1B16] border-b border-[rgba(193,123,42,0.15)] px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-[#F2EDE4]">{config.businessName}</h1>
            <p className="text-xs text-[#C17B2A]">&#9889; Estimate Builder</p>
          </div>
          <span className="text-[10px] bg-[#C17B2A]/20 text-[#C17B2A] px-2 py-0.5 rounded-full">{config.trade}</span>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-1">
          {STEPS.map((label, i) => {
            const stepNum = i + 1
            const isActive = step === stepNum
            const isDone = step > stepNum
            return (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-full h-1.5 rounded-full ${isDone ? 'bg-[#C17B2A]' : isActive ? 'bg-[#C17B2A]' : 'bg-[#2A2520]'}`} />
                <span className={`text-[10px] ${isActive ? 'text-[#C17B2A] font-medium' : isDone ? 'text-[#C17B2A]' : 'text-[#8A8070]'}`}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="px-4">
        <div className="max-w-lg mx-auto">

          {/* ═══ STEP 1 — Customer Info ═══ */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-base font-medium text-[#F2EDE4] mb-1">Customer Information</h2>

              <div>
                <label className="block text-xs text-[#8A8070] mb-1.5">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full bg-[#1E1B16] border border-[rgba(193,123,42,0.2)] rounded-xl px-4 py-3.5 text-base text-[#F2EDE4] placeholder-[#555] focus:outline-none focus:border-[#C17B2A]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-[#8A8070] mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full bg-[#1E1B16] border border-[rgba(193,123,42,0.2)] rounded-xl px-4 py-3.5 text-base text-[#F2EDE4] placeholder-[#555] focus:outline-none focus:border-[#C17B2A]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-[#8A8070] mb-1.5">Email <span className="text-[#555]">(optional)</span></label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="john@email.com"
                  className="w-full bg-[#1E1B16] border border-[rgba(193,123,42,0.2)] rounded-xl px-4 py-3.5 text-base text-[#F2EDE4] placeholder-[#555] focus:outline-none focus:border-[#C17B2A]"
                />
              </div>

              <div>
                <label className="block text-xs text-[#8A8070] mb-1.5">Job Address</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="123 Main St, Louisville, KY"
                  className="w-full bg-[#1E1B16] border border-[rgba(193,123,42,0.2)] rounded-xl px-4 py-3.5 text-base text-[#F2EDE4] placeholder-[#555] focus:outline-none focus:border-[#C17B2A]"
                  required
                />
              </div>

              <button
                onClick={() => { if (customerName && customerPhone && customerAddress) setStep(2) }}
                disabled={!customerName || !customerPhone || !customerAddress}
                className="w-full bg-[#C17B2A] text-white py-4 rounded-xl text-base font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-40 mt-4"
              >
                Next &rarr;
              </button>
            </div>
          )}

          {/* ═══ STEP 2 — Job Details ═══ */}
          {step === 2 && (
            <div className="space-y-4">
              <button onClick={() => setStep(1)} className="text-sm text-[#8A8070] hover:text-[#C17B2A] mb-1">&larr; Back</button>
              <h2 className="text-base font-medium text-[#F2EDE4] mb-1">Job Details</h2>

              <div>
                <label className="block text-xs text-[#8A8070] mb-1.5">Job Type</label>
                <select
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  className="w-full bg-[#1E1B16] border border-[rgba(193,123,42,0.2)] rounded-xl px-4 py-3.5 text-base text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]"
                  required
                >
                  <option value="">Select job type...</option>
                  {(JOB_TYPES[config.trade] || JOB_TYPES['Handyman']).map((jt) => (
                    <option key={jt} value={jt}>{jt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#8A8070] mb-1.5">Job Description</label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe specifically what needs to be done..."
                  className="w-full bg-[#1E1B16] border border-[rgba(193,123,42,0.2)] rounded-xl px-4 py-3.5 text-base text-[#F2EDE4] placeholder-[#555] focus:outline-none focus:border-[#C17B2A] resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-[#8A8070] mb-1.5">Estimated Labor Hours</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setLaborHours((h) => Math.max(0.5, h - 0.5))}
                    className="w-14 h-14 rounded-xl bg-[#1E1B16] border border-[rgba(193,123,42,0.2)] text-[#C17B2A] text-2xl font-bold flex items-center justify-center active:bg-[rgba(193,123,42,0.1)]"
                  >
                    &minus;
                  </button>
                  <div className="flex-1 text-center">
                    <div className="text-3xl font-semibold text-[#F2EDE4]">{laborHours}</div>
                    <div className="text-xs text-[#8A8070] mt-0.5">hours</div>
                  </div>
                  <button
                    onClick={() => setLaborHours((h) => h + 0.5)}
                    className="w-14 h-14 rounded-xl bg-[#1E1B16] border border-[rgba(193,123,42,0.2)] text-[#C17B2A] text-2xl font-bold flex items-center justify-center active:bg-[rgba(193,123,42,0.1)]"
                  >
                    +
                  </button>
                </div>
                <div className="text-center text-sm text-[#8A8070] mt-2">
                  Labor: {laborHours} hrs &times; ${fmt(laborRate)}/hr = <span className="text-[#C17B2A] font-medium">${fmt(laborTotal)}</span>
                </div>
              </div>

              <button
                onClick={() => { if (jobType && jobDescription) setStep(3) }}
                disabled={!jobType || !jobDescription}
                className="w-full bg-[#C17B2A] text-white py-4 rounded-xl text-base font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-40 mt-4"
              >
                Next &rarr;
              </button>
            </div>
          )}

          {/* ═══ STEP 3 — Materials ═══ */}
          {step === 3 && (
            <div className="space-y-4 pb-28">
              <button onClick={() => setStep(2)} className="text-sm text-[#8A8070] hover:text-[#C17B2A] mb-1">&larr; Back</button>
              <h2 className="text-base font-medium text-[#F2EDE4] mb-1">Materials</h2>

              {/* Selected materials */}
              {selectedMaterials.length > 0 && (
                <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.3)] p-3 space-y-3">
                  <h3 className="text-xs text-[#C17B2A] font-medium uppercase tracking-wide">Selected ({selectedMaterials.length})</h3>
                  {selectedMaterials.map((m) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[#F2EDE4] truncate">{m.name}</div>
                        <div className="text-[10px] text-[#8A8070]">${fmt(m.unitPrice)} / {m.unit}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => updateQty(m.id, -1)} className="w-8 h-8 rounded-lg bg-[#0E0C0A] text-[#C17B2A] text-sm font-bold flex items-center justify-center">&minus;</button>
                        <input
                          type="number"
                          value={m.quantity}
                          onChange={(e) => setQty(m.id, parseInt(e.target.value) || 1)}
                          className="w-12 h-8 rounded-lg bg-[#0E0C0A] text-center text-sm text-[#F2EDE4] border border-[rgba(193,123,42,0.2)] focus:outline-none"
                        />
                        <button onClick={() => updateQty(m.id, 1)} className="w-8 h-8 rounded-lg bg-[#0E0C0A] text-[#C17B2A] text-sm font-bold flex items-center justify-center">+</button>
                      </div>
                      <div className="text-sm text-[#F2EDE4] font-medium w-16 text-right">${fmt(m.unitPrice * m.quantity)}</div>
                      <button onClick={() => removeMaterial(m.id)} className="w-8 h-8 rounded-lg text-red-400/60 hover:text-red-400 text-sm flex items-center justify-center">&times;</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Search */}
              <input
                type="text"
                value={materialSearch}
                onChange={(e) => setMaterialSearch(e.target.value)}
                placeholder="Search materials..."
                className="w-full bg-[#1E1B16] border border-[rgba(193,123,42,0.2)] rounded-xl px-4 py-3 text-sm text-[#F2EDE4] placeholder-[#555] focus:outline-none focus:border-[#C17B2A]"
              />

              {/* Material list */}
              {materialsLoading ? (
                <p className="text-sm text-[#8A8070] text-center py-6">Loading materials...</p>
              ) : filteredMaterials.length === 0 ? (
                <p className="text-sm text-[#8A8070] text-center py-6">No materials found for {config.trade}</p>
              ) : (
                <div className="space-y-1 max-h-[40vh] overflow-y-auto rounded-xl">
                  {filteredMaterials.map((mat) => {
                    const isSelected = selectedMaterials.some((m) => m.id === mat.id)
                    return (
                      <div
                        key={mat.id}
                        className={`flex items-center justify-between px-3 py-3 rounded-lg ${isSelected ? 'bg-[rgba(193,123,42,0.1)] border border-[rgba(193,123,42,0.2)]' : 'bg-[#1E1B16]'}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-[#F2EDE4] truncate">{mat.materialName}</div>
                          <div className="text-[10px] text-[#8A8070]">per {mat.unit} &mdash; ${fmt(mat.currentPrice)}</div>
                        </div>
                        {isSelected ? (
                          <span className="text-[10px] text-[#C17B2A] font-medium px-2">Added</span>
                        ) : (
                          <button
                            onClick={() => addMaterial(mat)}
                            className="w-10 h-10 rounded-xl bg-[#C17B2A] text-white text-lg font-bold flex items-center justify-center active:bg-[#D4892F]"
                          >
                            +
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Custom material */}
              {!showCustomForm ? (
                <button
                  onClick={() => setShowCustomForm(true)}
                  className="w-full border border-dashed border-[rgba(193,123,42,0.3)] text-[#C17B2A] py-3 rounded-xl text-sm hover:bg-[rgba(193,123,42,0.05)]"
                >
                  + Custom Material
                </button>
              ) : (
                <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.2)] p-3 space-y-3">
                  <h3 className="text-xs text-[#C17B2A] font-medium">Add Custom Material</h3>
                  <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Material name" className="w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2.5 text-sm text-[#F2EDE4] placeholder-[#555] focus:outline-none focus:border-[#C17B2A]" />
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" value={customQty} onChange={(e) => setCustomQty(parseInt(e.target.value) || 1)} placeholder="Qty" className="bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2.5 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" />
                    <input type="text" value={customUnit} onChange={(e) => setCustomUnit(e.target.value)} placeholder="Unit" className="bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2.5 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" />
                    <input type="number" step="0.01" value={customPrice || ''} onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)} placeholder="Price" className="bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-3 py-2.5 text-sm text-[#F2EDE4] focus:outline-none focus:border-[#C17B2A]" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addCustomMaterial} disabled={!customName || customPrice <= 0} className="flex-1 bg-[#C17B2A] text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-40">Add</button>
                    <button onClick={() => setShowCustomForm(false)} className="px-4 py-2.5 rounded-lg text-sm text-[#8A8070] border border-[rgba(193,123,42,0.2)]">Cancel</button>
                  </div>
                </div>
              )}

              {/* Next button above sticky footer */}
              <button
                onClick={() => setStep(4)}
                className="w-full bg-[#C17B2A] text-white py-4 rounded-xl text-base font-medium hover:bg-[#D4892F] transition-colors mt-2"
              >
                Next &rarr;
              </button>

              {/* Sticky totals footer */}
              <div className="fixed bottom-0 left-0 right-0 bg-[#1E1B16] border-t border-[rgba(193,123,42,0.2)] px-4 py-3 z-10">
                <div className="max-w-lg mx-auto flex items-center justify-between text-sm">
                  <span className="text-[#8A8070]">Materials: <span className="text-[#F2EDE4]">${fmt(materialsTotal)}</span></span>
                  <span className="text-[#8A8070]">Labor: <span className="text-[#F2EDE4]">${fmt(laborTotal)}</span></span>
                  <span className="text-[#C17B2A] font-semibold">Total: ${fmt(totalAmount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 4 — Review & Send ═══ */}
          {step === 4 && (
            <div className="space-y-4 pb-8">
              <button onClick={() => setStep(3)} className="text-sm text-[#8A8070] hover:text-[#C17B2A] mb-1">&larr; Back</button>
              <h2 className="text-base font-medium text-[#F2EDE4] mb-1">Review Estimate</h2>

              {/* Customer */}
              <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
                <h3 className="text-[10px] text-[#8A8070] uppercase tracking-wide mb-2">Customer</h3>
                <div className="text-sm text-[#F2EDE4] font-medium">{customerName}</div>
                <div className="text-xs text-[#8A8070] mt-0.5">{customerPhone}</div>
                {customerEmail && <div className="text-xs text-[#8A8070]">{customerEmail}</div>}
                <div className="text-xs text-[#8A8070]">{customerAddress}</div>
              </div>

              {/* Job */}
              <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
                <h3 className="text-[10px] text-[#8A8070] uppercase tracking-wide mb-2">Job</h3>
                <div className="text-sm text-[#F2EDE4] font-medium">{jobType}</div>
                <div className="text-xs text-[#8A8070] mt-1">{jobDescription}</div>
              </div>

              {/* Cost Breakdown */}
              <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4">
                <h3 className="text-[10px] text-[#8A8070] uppercase tracking-wide mb-3">Cost Breakdown</h3>

                {/* Labor */}
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[#8A8070]">Labor ({laborHours} hrs &times; ${fmt(laborRate)}/hr)</span>
                  <span className="text-[#F2EDE4]">${fmt(laborTotal)}</span>
                </div>

                {/* Materials */}
                {selectedMaterials.length > 0 && (
                  <div className="border-t border-[rgba(193,123,42,0.08)] pt-2 mt-2 space-y-1.5">
                    {selectedMaterials.map((m) => (
                      <div key={m.id} className="flex justify-between text-xs">
                        <span className="text-[#8A8070] truncate flex-1 mr-2">{m.name} &times; {m.quantity}</span>
                        <span className="text-[#F2EDE4]">${fmt(m.unitPrice * m.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Totals */}
                <div className="border-t border-[rgba(193,123,42,0.15)] mt-3 pt-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8A8070]">Subtotal</span>
                    <span className="text-[#F2EDE4]">${fmt(subtotal)}</span>
                  </div>
                  {config.taxRate > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#8A8070]">Tax ({config.taxRate}%)</span>
                      <span className="text-[#F2EDE4]">${fmt(taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-semibold pt-1">
                    <span className="text-[#F2EDE4]">Total</span>
                    <span className="text-[#C17B2A]">${fmt(totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div className="bg-[#1E1B16] rounded-xl border border-[rgba(193,123,42,0.15)] p-4 space-y-3">
                <h3 className="text-[10px] text-[#8A8070] uppercase tracking-wide mb-2">Terms</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-[#8A8070]">Deposit Required</span>
                  <span className="text-[#F2EDE4] font-medium">${fmt(depositRequired)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#8A8070]">Valid Until</span>
                  <span className="text-[#F2EDE4]">{new Date(Date.now() + config.validityDays * 86400000).toLocaleDateString()}</span>
                </div>
                <div className="text-xs text-[#8A8070] pt-1 border-t border-[rgba(193,123,42,0.08)]">{config.paymentTerms}</div>
                <div className="text-xs text-[#8A8070]">{config.warrantyTerms}</div>
                {config.escalationClause && (
                  <div className="text-xs text-[#8A8070] italic">
                    Material prices are subject to change. This estimate is valid for {config.validityDays} days from the date issued.
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => saveEstimate('sent')}
                  disabled={saving}
                  className="w-full bg-[#C17B2A] text-white py-4 rounded-xl text-base font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? 'Saving...' : <><span>&#128228;</span> Send to Customer</>}
                </button>
                <button
                  onClick={() => saveEstimate('draft')}
                  disabled={saving}
                  className="w-full border border-[rgba(193,123,42,0.3)] text-[#C17B2A] py-4 rounded-xl text-base font-medium hover:bg-[rgba(193,123,42,0.05)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? 'Saving...' : <><span>&#128190;</span> Save as Draft</>}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
