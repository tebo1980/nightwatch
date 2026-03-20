'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface AgentClientBasic { id: string; businessName: string; flynnEnabled: boolean }
interface Vehicle { id: string; vehicleName: string; make: string; model: string; year: number; licensePlate: string | null; currentMileage: number; maintenanceLogs: MaintLog[] }
interface FuelEntry { id: string; vehicleId: string; date: string; gallons: number; costPerGallon: number; totalCost: number; mileageAtFill: number; vehicle: { vehicleName: string } }
interface MaintLog { id: string; vehicleId: string; date: string; type: string; cost: number; mileageAtService: number; notes: string | null; nextDueMileage: number | null; vehicle?: { vehicleName: string } }

const TABS = ['Vehicles', 'Fuel Log', 'Maintenance', 'Fleet Report'] as const
const SERVICE_TYPES = ['Oil Change', 'Tire Rotation', 'Brake Job', 'Transmission Service', 'Battery Replacement', 'Air Filter', 'Inspection', 'Other']

export default function FlynnDashboard() {
  const [clients, setClients] = useState<AgentClientBasic[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [tab, setTab] = useState<typeof TABS[number]>('Vehicles')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [fuelLogs, setFuelLogs] = useState<FuelEntry[]>([])
  const [maintLogs, setMaintLogs] = useState<MaintLog[]>([])

  // Forms
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [showFuelForm, setShowFuelForm] = useState(false)
  const [showMaintForm, setShowMaintForm] = useState(false)
  const [vf, setVf] = useState({ vehicleName: '', make: '', model: '', year: '', licensePlate: '', currentMileage: '' })
  const [ff, setFf] = useState({ vehicleId: '', date: '', gallons: '', costPerGallon: '', mileageAtFill: '' })
  const [mf, setMf] = useState({ vehicleId: '', date: '', type: SERVICE_TYPES[0], cost: '', mileageAtService: '', notes: '', nextDueMileage: '' })

  // Report
  const [reportMonth, setReportMonth] = useState(new Date().getMonth())
  const [reportYear, setReportYear] = useState(new Date().getFullYear())
  const [reportText, setReportText] = useState('')
  const [generatingReport, setGeneratingReport] = useState(false)

  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/agent-clients').then((r) => r.json()).then((data) => {
      const fc = (data.clients || []).filter((c: AgentClientBasic) => c.flynnEnabled)
      setClients(fc)
      if (fc.length > 0) setSelectedClientId(fc[0].id)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const fetchData = useCallback(() => {
    if (!selectedClientId) return
    fetch(`/api/flynn/vehicles?clientId=${selectedClientId}`).then((r) => r.json()).then((d) => setVehicles(d.vehicles || [])).catch(() => {})
    fetch(`/api/flynn/fuel?clientId=${selectedClientId}`).then((r) => r.json()).then((d) => setFuelLogs(d.logs || [])).catch(() => {})
    fetch(`/api/flynn/maintenance?clientId=${selectedClientId}`).then((r) => r.json()).then((d) => setMaintLogs(d.logs || [])).catch(() => {})
  }, [selectedClientId])

  useEffect(() => { fetchData() }, [fetchData])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const alerts = vehicles.filter((v) => v.maintenanceLogs.some((m) => m.nextDueMileage && v.currentMileage >= m.nextDueMileage - 500))

  const submitVehicle = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/flynn/vehicles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: selectedClientId, ...vf, year: Number(vf.year), currentMileage: Number(vf.currentMileage) }) })
      const data = await res.json()
      if (data.success) { showToast('Vehicle added!'); setShowVehicleForm(false); setVf({ vehicleName: '', make: '', model: '', year: '', licensePlate: '', currentMileage: '' }); fetchData() }
      else showToast(data.error || 'Failed')
    } catch { showToast('Error') } finally { setSubmitting(false) }
  }

  const submitFuel = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/flynn/fuel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ff) })
      const data = await res.json()
      if (data.success) { showToast('Fuel entry added!'); setShowFuelForm(false); setFf({ vehicleId: '', date: '', gallons: '', costPerGallon: '', mileageAtFill: '' }); fetchData() }
      else showToast(data.error || 'Failed')
    } catch { showToast('Error') } finally { setSubmitting(false) }
  }

  const submitMaint = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/flynn/maintenance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mf) })
      const data = await res.json()
      if (data.success) { showToast('Maintenance logged!'); setShowMaintForm(false); setMf({ vehicleId: '', date: '', type: SERVICE_TYPES[0], cost: '', mileageAtService: '', notes: '', nextDueMileage: '' }); fetchData() }
      else showToast(data.error || 'Failed')
    } catch { showToast('Error') } finally { setSubmitting(false) }
  }

  const generateReport = async () => {
    setGeneratingReport(true); setReportText('')
    try {
      const res = await fetch('/api/flynn/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: selectedClientId, month: reportMonth, year: reportYear }) })
      const data = await res.json()
      if (data.success) { setReportText(data.report); showToast('Report generated!') }
      else showToast(data.error || 'Failed')
    } catch { showToast('Error') } finally { setGeneratingReport(false) }
  }

  const inputCls = 'w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] transition-colors placeholder:text-[#8A8070]/50'

  if (loading) return <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center text-[#8A8070]">Loading...</div>

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        {toast && <div className="fixed top-6 right-6 bg-[#1E1B16] border border-[#C17B2A]/30 text-[#F2EDE4] text-sm px-5 py-3 rounded-lg shadow-lg z-50">{toast}</div>}

        <div className="mb-8">
          <Link href="/" className="text-xs text-[#8A8070] hover:text-[#C17B2A] transition-colors">&larr; Dashboard</Link>
          <h1 className="text-2xl font-semibold text-[#C17B2A] mt-1">Flynn</h1>
          <p className="text-sm text-[#8A8070]">Fleet & Vehicle Tracking</p>
        </div>

        <div className="mb-6">
          <select className="bg-[#1E1B16] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] w-full md:w-72" value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}>
            {clients.length === 0 && <option value="">No Flynn-enabled clients</option>}
            {clients.map((c) => <option key={c.id} value={c.id}>{c.businessName}</option>)}
          </select>
        </div>

        {/* Maintenance Alerts */}
        <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-4 mb-6">
          {alerts.length === 0 ? (
            <p className="text-sm text-green-400">All vehicles up to date</p>
          ) : (
            <div>
              <p className="text-sm text-[#C17B2A] font-medium mb-2">Maintenance Alerts</p>
              {alerts.map((v) => (
                <p key={v.id} className="text-xs text-[#F2EDE4]">{v.vehicleName} — <span className="text-[#C17B2A]">Service Due</span> at {v.currentMileage.toLocaleString()} mi</p>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${tab === t ? 'bg-[#C17B2A] text-white' : 'text-[#8A8070] hover:text-[#F2EDE4]'}`}>{t}</button>
          ))}
        </div>

        {/* Vehicles Tab */}
        {tab === 'Vehicles' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setShowVehicleForm(!showVehicleForm)} className="bg-[#C17B2A] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#D4892F] transition-colors">Add Vehicle</button>
            </div>
            {showVehicleForm && (
              <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-5 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input className={inputCls} placeholder="Vehicle nickname" value={vf.vehicleName} onChange={(e) => setVf({ ...vf, vehicleName: e.target.value })} />
                  <input className={inputCls} placeholder="Make" value={vf.make} onChange={(e) => setVf({ ...vf, make: e.target.value })} />
                  <input className={inputCls} placeholder="Model" value={vf.model} onChange={(e) => setVf({ ...vf, model: e.target.value })} />
                  <input className={inputCls} type="number" placeholder="Year" value={vf.year} onChange={(e) => setVf({ ...vf, year: e.target.value })} />
                  <input className={inputCls} placeholder="License plate (optional)" value={vf.licensePlate} onChange={(e) => setVf({ ...vf, licensePlate: e.target.value })} />
                  <input className={inputCls} type="number" placeholder="Current mileage" value={vf.currentMileage} onChange={(e) => setVf({ ...vf, currentMileage: e.target.value })} />
                </div>
                <button onClick={submitVehicle} disabled={submitting || !vf.vehicleName || !vf.make || !vf.model} className="bg-[#C17B2A] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#D4892F] disabled:opacity-40">{submitting ? 'Adding...' : 'Add Vehicle'}</button>
              </div>
            )}
            {vehicles.length === 0 ? <p className="text-sm text-[#8A8070] text-center py-8">No vehicles yet.</p> : vehicles.map((v) => (
              <div key={v.id} className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#F2EDE4]">{v.vehicleName}</p>
                  <p className="text-xs text-[#8A8070]">{v.year} {v.make} {v.model}{v.licensePlate ? ` — ${v.licensePlate}` : ''}</p>
                  <p className="text-xs text-[#8A8070]">{v.currentMileage.toLocaleString()} miles</p>
                </div>
                {v.maintenanceLogs.some((m) => m.nextDueMileage && v.currentMileage >= m.nextDueMileage - 500) && (
                  <span className="text-[10px] bg-[#C17B2A]/20 text-[#C17B2A] px-2.5 py-1 rounded-full font-medium">Service Due</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Fuel Log Tab */}
        {tab === 'Fuel Log' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => { setShowFuelForm(!showFuelForm); if (vehicles.length > 0 && !ff.vehicleId) setFf({ ...ff, vehicleId: vehicles[0].id }) }} className="bg-[#C17B2A] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#D4892F] transition-colors">Add Fuel Entry</button>
            </div>
            {showFuelForm && (
              <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-5 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select className={inputCls} value={ff.vehicleId} onChange={(e) => setFf({ ...ff, vehicleId: e.target.value })}>
                    <option value="">Select vehicle</option>
                    {vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicleName}</option>)}
                  </select>
                  <input className={inputCls} type="date" value={ff.date} onChange={(e) => setFf({ ...ff, date: e.target.value })} />
                  <input className={inputCls} type="number" step="0.1" placeholder="Gallons" value={ff.gallons} onChange={(e) => setFf({ ...ff, gallons: e.target.value })} />
                  <input className={inputCls} type="number" step="0.01" placeholder="Cost per gallon" value={ff.costPerGallon} onChange={(e) => setFf({ ...ff, costPerGallon: e.target.value })} />
                  <input className={inputCls} type="number" placeholder="Mileage at fill-up" value={ff.mileageAtFill} onChange={(e) => setFf({ ...ff, mileageAtFill: e.target.value })} />
                  <div className="flex items-center text-sm text-[#8A8070]">Total: ${ff.gallons && ff.costPerGallon ? (Number(ff.gallons) * Number(ff.costPerGallon)).toFixed(2) : '0.00'}</div>
                </div>
                <button onClick={submitFuel} disabled={submitting || !ff.vehicleId || !ff.date} className="bg-[#C17B2A] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#D4892F] disabled:opacity-40">{submitting ? 'Adding...' : 'Add Entry'}</button>
              </div>
            )}
            {fuelLogs.length === 0 ? <p className="text-sm text-[#8A8070] text-center py-8">No fuel logs yet.</p> : fuelLogs.map((f) => (
              <div key={f.id} className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#F2EDE4]">{f.vehicle.vehicleName}</p>
                  <p className="text-xs text-[#8A8070]">{new Date(f.date).toLocaleDateString()} — {f.gallons} gal @ ${f.costPerGallon}/gal — {f.mileageAtFill.toLocaleString()} mi</p>
                </div>
                <p className="text-sm font-medium text-[#C17B2A]">${f.totalCost.toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Maintenance Tab */}
        {tab === 'Maintenance' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => { setShowMaintForm(!showMaintForm); if (vehicles.length > 0 && !mf.vehicleId) setMf({ ...mf, vehicleId: vehicles[0].id }) }} className="bg-[#C17B2A] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#D4892F] transition-colors">Add Maintenance</button>
            </div>
            {showMaintForm && (
              <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-5 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select className={inputCls} value={mf.vehicleId} onChange={(e) => setMf({ ...mf, vehicleId: e.target.value })}>
                    <option value="">Select vehicle</option>
                    {vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicleName}</option>)}
                  </select>
                  <input className={inputCls} type="date" value={mf.date} onChange={(e) => setMf({ ...mf, date: e.target.value })} />
                  <select className={inputCls} value={mf.type} onChange={(e) => setMf({ ...mf, type: e.target.value })}>
                    {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input className={inputCls} type="number" step="0.01" placeholder="Cost" value={mf.cost} onChange={(e) => setMf({ ...mf, cost: e.target.value })} />
                  <input className={inputCls} type="number" placeholder="Mileage at service" value={mf.mileageAtService} onChange={(e) => setMf({ ...mf, mileageAtService: e.target.value })} />
                  <input className={inputCls} type="number" placeholder="Next due mileage (optional)" value={mf.nextDueMileage} onChange={(e) => setMf({ ...mf, nextDueMileage: e.target.value })} />
                </div>
                <input className={inputCls} placeholder="Notes (optional)" value={mf.notes} onChange={(e) => setMf({ ...mf, notes: e.target.value })} />
                <button onClick={submitMaint} disabled={submitting || !mf.vehicleId || !mf.date} className="bg-[#C17B2A] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#D4892F] disabled:opacity-40">{submitting ? 'Adding...' : 'Log Maintenance'}</button>
              </div>
            )}
            {maintLogs.length === 0 ? <p className="text-sm text-[#8A8070] text-center py-8">No maintenance logs yet.</p> : maintLogs.map((m) => (
              <div key={m.id} className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#F2EDE4]">{m.vehicle?.vehicleName} — {m.type}</p>
                  <p className="text-xs text-[#8A8070]">{new Date(m.date).toLocaleDateString()} — {m.mileageAtService.toLocaleString()} mi{m.notes ? ` — ${m.notes}` : ''}</p>
                </div>
                <p className="text-sm font-medium text-[#C17B2A]">${m.cost.toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Fleet Report Tab */}
        {tab === 'Fleet Report' && (
          <div className="space-y-4">
            <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-5 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select className={inputCls} value={reportMonth} onChange={(e) => setReportMonth(Number(e.target.value))}>
                  {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select className={inputCls} value={reportYear} onChange={(e) => setReportYear(Number(e.target.value))}>
                  {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <button onClick={generateReport} disabled={generatingReport} className="bg-[#C17B2A] text-white px-5 py-2.5 rounded-lg text-sm hover:bg-[#D4892F] disabled:opacity-40">{generatingReport ? 'Generating...' : 'Generate Fleet Report'}</button>
              </div>
            </div>
            {reportText && (
              <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-medium text-[#F2EDE4]">Fleet Report</h3>
                  <button onClick={() => navigator.clipboard.writeText(reportText).then(() => showToast('Copied!'))} className="text-xs text-[#C17B2A] hover:text-[#D4892F]">Copy</button>
                </div>
                <p className="text-sm text-[#F2EDE4] whitespace-pre-line leading-relaxed">{reportText}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
