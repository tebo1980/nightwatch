'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface AgentClientBasic { id: string; businessName: string; riverEnabled: boolean }
interface Appointment {
  id: string; customerName: string; customerPhone: string; customerEmail: string | null
  serviceType: string; scheduledAt: string; durationMinutes: number
  providerName: string | null; notes: string | null; status: string
  recoveryMessageSentAt: string | null
  reminders: Reminder[]
}
interface Reminder {
  id: string; type: string; scheduledFor: string; status: string; message: string; sentAt: string | null
}

const TABS = ['Schedule', 'Upcoming Reminders', 'No-Show Log'] as const
const SERVICE_TYPES = ['Consultation', 'Repair', 'Install', 'Maintenance', 'Checkup', 'Other']

export default function RiverDashboard() {
  const [clients, setClients] = useState<AgentClientBasic[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [tab, setTab] = useState<typeof TABS[number]>('Schedule')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])

  const [showForm, setShowForm] = useState(false)
  const [af, setAf] = useState({ customerName: '', customerPhone: '', customerEmail: '', serviceType: SERVICE_TYPES[0], scheduledAt: '', durationMinutes: '60', providerName: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [sendingAll, setSendingAll] = useState(false)
  const [sendingId, setSendingId] = useState('')

  useEffect(() => {
    fetch('/api/agent-clients').then((r) => r.json()).then((data) => {
      const cc = (data.clients || []).filter((c: AgentClientBasic) => c.riverEnabled)
      setClients(cc)
      if (cc.length > 0) setSelectedClientId(cc[0].id)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const fetchData = useCallback(() => {
    if (!selectedClientId) return
    fetch(`/api/river/appointments?clientId=${selectedClientId}`).then((r) => r.json()).then((d) => setAppointments(d.appointments || [])).catch(() => {})
    fetch(`/api/river/reminders?clientId=${selectedClientId}`).then((r) => r.json()).then((d) => setReminders(d.reminders || [])).catch(() => {})
  }, [selectedClientId])

  useEffect(() => { fetchData() }, [fetchData])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const submitAppointment = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/river/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: selectedClientId, ...af, durationMinutes: Number(af.durationMinutes) }) })
      const data = await res.json()
      if (data.success) { showToast('Appointment created!'); setShowForm(false); setAf({ customerName: '', customerPhone: '', customerEmail: '', serviceType: SERVICE_TYPES[0], scheduledAt: '', durationMinutes: '60', providerName: '', notes: '' }); fetchData() }
      else showToast(data.error || 'Failed')
    } catch { showToast('Error') } finally { setSubmitting(false) }
  }

  const sendReminder = async (reminderId: string) => {
    setSendingId(reminderId)
    try {
      const res = await fetch('/api/river/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reminderId }) })
      const data = await res.json()
      if (data.success) { showToast('Reminder sent!'); fetchData() } else showToast(data.error || 'Failed')
    } catch { showToast('Error') } finally { setSendingId('') }
  }

  const sendAllDue = async () => {
    setSendingAll(true)
    try {
      const res = await fetch('/api/river/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sendAll: true, clientId: selectedClientId }) })
      const data = await res.json()
      if (data.success) { showToast(`Sent ${data.sent} of ${data.total} reminders`); fetchData() } else showToast(data.error || 'Failed')
    } catch { showToast('Error') } finally { setSendingAll(false) }
  }

  const markNoShow = async (id: string) => {
    try {
      const res = await fetch('/api/river/appointments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'no-show' }) })
      const data = await res.json()
      if (data.success) { showToast('Marked as no-show'); fetchData() } else showToast(data.error || 'Failed')
    } catch { showToast('Error') }
  }

  const markCompleted = async (id: string) => {
    try {
      const res = await fetch('/api/river/appointments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'completed' }) })
      const data = await res.json()
      if (data.success) { showToast('Marked completed'); fetchData() } else showToast(data.error || 'Failed')
    } catch { showToast('Error') }
  }

  // Stats
  const now = new Date()
  const upcoming = appointments.filter((a) => new Date(a.scheduledAt) > now && a.status === 'confirmed')
  const noShows = appointments.filter((a) => a.status === 'no-show')
  const todayAppts = appointments.filter((a) => { const d = new Date(a.scheduledAt); return d.toDateString() === now.toDateString() && a.status !== 'cancelled' })
  const pendingReminders = reminders.filter((r) => r.status === 'pending')
  const dueReminders = pendingReminders.filter((r) => new Date(r.scheduledFor) <= now)

  const inputCls = 'w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] transition-colors placeholder:text-[#8A8070]/50'

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const formatTime = (d: string) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const formatDateTime = (d: string) => `${formatDate(d)} at ${formatTime(d)}`

  const statusColor = (s: string) => s === 'confirmed' ? 'text-green-400' : s === 'no-show' ? 'text-red-400' : s === 'completed' ? 'text-blue-400' : s === 'cancelled' ? 'text-[#8A8070]' : 'text-[#F2EDE4]'

  if (loading) return <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center text-[#8A8070]">Loading...</div>

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        {toast && <div className="fixed top-6 right-6 bg-[#1E1B16] border border-[#C17B2A]/30 text-[#F2EDE4] text-sm px-5 py-3 rounded-lg shadow-lg z-50">{toast}</div>}

        <div className="mb-8">
          <Link href="/" className="text-xs text-[#8A8070] hover:text-[#C17B2A] transition-colors">&larr; Dashboard</Link>
          <h1 className="text-2xl font-semibold text-[#C17B2A] mt-1">River</h1>
          <p className="text-sm text-[#8A8070]">Appointments & Reminders</p>
        </div>

        <div className="mb-6">
          <select className="bg-[#1E1B16] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] w-full md:w-72" value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}>
            {clients.length === 0 && <option value="">No River-enabled clients</option>}
            {clients.map((c) => <option key={c.id} value={c.id}>{c.businessName}</option>)}
          </select>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-[#C17B2A]">{todayAppts.length}</p>
            <p className="text-[10px] text-[#8A8070]">Today</p>
          </div>
          <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-[#F2EDE4]">{upcoming.length}</p>
            <p className="text-[10px] text-[#8A8070]">Upcoming</p>
          </div>
          <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-[#F2EDE4]">{dueReminders.length}</p>
            <p className="text-[10px] text-[#8A8070]">Reminders Due</p>
          </div>
          <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-3 text-center">
            <p className={`text-lg font-semibold ${noShows.length > 0 ? 'text-red-400' : 'text-green-400'}`}>{noShows.length}</p>
            <p className="text-[10px] text-[#8A8070]">No-Shows</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${tab === t ? 'bg-[#C17B2A] text-white' : 'text-[#8A8070] hover:text-[#F2EDE4]'}`}>{t}</button>
          ))}
        </div>

        {/* Schedule Tab */}
        {tab === 'Schedule' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setShowForm(!showForm)} className="bg-[#C17B2A] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#D4892F] transition-colors">Add Appointment</button>
            </div>
            {showForm && (
              <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-5 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input className={inputCls} placeholder="Customer name" value={af.customerName} onChange={(e) => setAf({ ...af, customerName: e.target.value })} />
                  <input className={inputCls} placeholder="Phone number" value={af.customerPhone} onChange={(e) => setAf({ ...af, customerPhone: e.target.value })} />
                  <input className={inputCls} placeholder="Email (optional)" value={af.customerEmail} onChange={(e) => setAf({ ...af, customerEmail: e.target.value })} />
                  <select className={inputCls} value={af.serviceType} onChange={(e) => setAf({ ...af, serviceType: e.target.value })}>{SERVICE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
                  <input className={inputCls} type="datetime-local" value={af.scheduledAt} onChange={(e) => setAf({ ...af, scheduledAt: e.target.value })} />
                  <input className={inputCls} type="number" placeholder="Duration (min)" value={af.durationMinutes} onChange={(e) => setAf({ ...af, durationMinutes: e.target.value })} />
                  <input className={inputCls} placeholder="Provider name (optional)" value={af.providerName} onChange={(e) => setAf({ ...af, providerName: e.target.value })} />
                  <input className={inputCls} placeholder="Notes (optional)" value={af.notes} onChange={(e) => setAf({ ...af, notes: e.target.value })} />
                </div>
                <button onClick={submitAppointment} disabled={submitting || !af.customerName || !af.customerPhone || !af.scheduledAt} className="bg-[#C17B2A] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#D4892F] disabled:opacity-40">{submitting ? 'Creating...' : 'Create Appointment'}</button>
              </div>
            )}
            {appointments.filter((a) => a.status !== 'no-show').length === 0 ? (
              <p className="text-sm text-[#8A8070] text-center py-8">No appointments yet.</p>
            ) : appointments.filter((a) => a.status !== 'no-show').map((a) => (
              <div key={a.id} className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-[#F2EDE4] font-medium">{a.customerName} — {a.serviceType}</p>
                    <p className="text-xs text-[#8A8070] mt-0.5">{formatDateTime(a.scheduledAt)} ({a.durationMinutes}min){a.providerName ? ` — ${a.providerName}` : ''}</p>
                    <p className="text-xs text-[#8A8070]">{a.customerPhone}{a.customerEmail ? ` — ${a.customerEmail}` : ''}</p>
                    {a.notes && <p className="text-xs text-[#8A8070] italic mt-1">{a.notes}</p>}
                    <p className={`text-xs mt-1 ${statusColor(a.status)}`}>{a.status}</p>
                  </div>
                  <div className="flex gap-2">
                    {a.status === 'confirmed' && new Date(a.scheduledAt) < now && (
                      <>
                        <button onClick={() => markCompleted(a.id)} className="text-xs text-green-400 hover:text-green-300">Complete</button>
                        <button onClick={() => markNoShow(a.id)} className="text-xs text-red-400 hover:text-red-300">No-Show</button>
                      </>
                    )}
                  </div>
                </div>
                {a.reminders.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[rgba(193,123,42,0.1)]">
                    <p className="text-[10px] text-[#8A8070] mb-1">Reminders:</p>
                    {a.reminders.map((r) => (
                      <p key={r.id} className="text-[10px] text-[#8A8070]">
                        {r.type.replace('_', ' ')} — {formatDateTime(r.scheduledFor)} — <span className={r.status === 'sent' ? 'text-green-400' : r.status === 'failed' ? 'text-red-400' : 'text-[#C17B2A]'}>{r.status}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upcoming Reminders Tab */}
        {tab === 'Upcoming Reminders' && (
          <div className="space-y-4">
            {dueReminders.length > 0 && (
              <div className="flex justify-end">
                <button onClick={sendAllDue} disabled={sendingAll} className="bg-[#C17B2A] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#D4892F] disabled:opacity-40">{sendingAll ? 'Sending...' : `Send All Due (${dueReminders.length})`}</button>
              </div>
            )}
            {pendingReminders.length === 0 ? (
              <p className="text-sm text-[#8A8070] text-center py-8">No pending reminders.</p>
            ) : pendingReminders.map((r) => {
              const isDue = new Date(r.scheduledFor) <= now
              return (
                <div key={r.id} className={`bg-[#1E1B16] border rounded-xl p-4 flex items-center justify-between ${isDue ? 'border-[#C17B2A]/40' : 'border-[rgba(193,123,42,0.15)]'}`}>
                  <div>
                    <p className="text-sm text-[#F2EDE4]">{(r as Reminder & { appointment?: { customerName?: string; serviceType?: string } }).appointment?.customerName || 'Customer'} — {r.type.replace('_', ' ')}</p>
                    <p className="text-xs text-[#8A8070] mt-0.5">Scheduled: {formatDateTime(r.scheduledFor)}</p>
                    <p className="text-xs text-[#8A8070] mt-0.5 max-w-lg truncate">{r.message}</p>
                    {isDue && <span className="text-[10px] text-[#C17B2A] font-medium">DUE NOW</span>}
                  </div>
                  <button onClick={() => sendReminder(r.id)} disabled={sendingId === r.id} className="text-xs text-[#C17B2A] hover:text-[#D4892F] disabled:opacity-40 whitespace-nowrap">{sendingId === r.id ? 'Sending...' : 'Send Now'}</button>
                </div>
              )
            })}
          </div>
        )}

        {/* No-Show Log Tab */}
        {tab === 'No-Show Log' && (
          <div className="space-y-4">
            {noShows.length === 0 ? (
              <p className="text-sm text-[#8A8070] text-center py-8">No no-shows recorded.</p>
            ) : noShows.map((a) => (
              <div key={a.id} className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#F2EDE4]">{a.customerName} — {a.serviceType}</p>
                  <p className="text-xs text-[#8A8070]">{formatDateTime(a.scheduledAt)}{a.providerName ? ` — ${a.providerName}` : ''}</p>
                  <p className="text-xs text-[#8A8070]">{a.customerPhone}</p>
                  {a.recoveryMessageSentAt && <p className="text-[10px] text-green-400 mt-1">Recovery sent {formatDate(a.recoveryMessageSentAt)}</p>}
                </div>
                {!a.recoveryMessageSentAt && (
                  <button onClick={() => { showToast('Recovery messaging requires Twilio config') }} className="text-xs text-[#C17B2A] hover:text-[#D4892F] whitespace-nowrap">Send Recovery</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
