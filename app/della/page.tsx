'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

const EMAIL_TYPES = [
  'Quote follow-up', 'Appointment confirmation', 'Job completion thank you',
  'Supplier or vendor inquiry', 'Customer complaint response', 'Referral thank you',
  'Service reminder', 'Proposal or estimate submission', 'Partnership or referral inquiry',
  'General business email',
]

interface AgentClientBasic { id: string; businessName: string; dellaEnabled: boolean }

interface DraftData {
  id: string; clientId: string; emailType: string; recipientName: string
  recipientEmail: string | null; subject: string; body: string
  requestNotes: string | null; status: string; sentAt: string | null; createdAt: string
}

export default function DellaDashboard() {
  const [clients, setClients] = useState<AgentClientBasic[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [drafts, setDrafts] = useState<DraftData[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  // Request form
  const [emailType, setEmailType] = useState(EMAIL_TYPES[0])
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [requestNotes, setRequestNotes] = useState('')
  const [drafting, setDrafting] = useState(false)

  // Draft review
  const [activeDraft, setActiveDraft] = useState<DraftData | null>(null)
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Expanded draft in history
  const [expandedDraft, setExpandedDraft] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/agent-clients')
      .then((r) => r.json())
      .then((data) => {
        const dellaClients = (data.clients || []).filter((c: AgentClientBasic) => c.dellaEnabled)
        setClients(dellaClients)
        if (dellaClients.length > 0) setSelectedClientId(dellaClients[0].id)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const fetchDrafts = useCallback(() => {
    if (!selectedClientId) return
    fetch(`/api/della/drafts?clientId=${selectedClientId}`)
      .then((r) => r.json())
      .then((d) => setDrafts(d.drafts || []))
      .catch(() => {})
  }, [selectedClientId])

  useEffect(() => { fetchDrafts() }, [fetchDrafts])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const handleDraft = async () => {
    if (!selectedClientId || !recipientName || !requestNotes) return
    setDrafting(true)
    try {
      const res = await fetch('/api/della/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClientId, emailType, recipientName, recipientEmail, requestNotes }),
      })
      const data = await res.json()
      if (data.success && data.draft) {
        setActiveDraft(data.draft)
        setEditSubject(data.draft.subject)
        setEditBody(data.draft.body)
        setEditEmail(data.draft.recipientEmail || recipientEmail)
        showToast('Draft ready!')
        fetchDrafts()
      } else {
        showToast('Draft failed.')
      }
    } catch { showToast('Draft error.') }
    finally { setDrafting(false) }
  }

  const handleSend = async () => {
    if (!activeDraft) return
    setSending(true)
    setShowConfirm(false)
    try {
      const res = await fetch('/api/della/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: activeDraft.id, finalSubject: editSubject, finalBody: editBody, recipientEmail: editEmail }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('Email sent!')
        setActiveDraft(null)
        setRecipientName('')
        setRecipientEmail('')
        setRequestNotes('')
        fetchDrafts()
      } else {
        showToast(data.error || 'Send failed.')
      }
    } catch { showToast('Send error.') }
    finally { setSending(false) }
  }

  const handleRegenerate = () => {
    setActiveDraft(null)
    handleDraft()
  }

  const inputCls = 'w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] transition-colors placeholder:text-[#8A8070]/50'

  if (loading) return <div className="min-h-screen bg-[#0E0C0A] flex items-center justify-center text-[#8A8070]">Loading...</div>

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        {toast && <div className="fixed top-6 right-6 bg-[#1E1B16] border border-[#C17B2A]/30 text-[#F2EDE4] text-sm px-5 py-3 rounded-lg shadow-lg z-50">{toast}</div>}

        {/* Confirm Modal */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.3)] rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-base font-medium text-[#F2EDE4] mb-2">Send this email?</h3>
              <p className="text-sm text-[#8A8070] mb-4">To {activeDraft?.recipientName || recipientName} at {editEmail}</p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirm(false)} className="flex-1 border border-[rgba(193,123,42,0.3)] text-[#C17B2A] py-2 rounded-lg text-sm hover:bg-[rgba(193,123,42,0.1)] transition-colors">Cancel</button>
                <button onClick={handleSend} disabled={sending} className="flex-1 bg-[#C17B2A] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-50">{sending ? 'Sending...' : 'Send'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-xs text-[#8A8070] hover:text-[#C17B2A] transition-colors">&larr; Dashboard</Link>
          <h1 className="text-2xl font-semibold text-[#F2EDE4] mt-1">Della — Email Secretary</h1>
          <p className="text-sm text-[#8A8070]">Describe what you need, Della drafts the email</p>
        </div>

        {/* Client Selector */}
        <div className="mb-6">
          <select className="bg-[#1E1B16] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] w-full md:w-72" value={selectedClientId} onChange={(e) => { setSelectedClientId(e.target.value); setActiveDraft(null) }}>
            {clients.length === 0 && <option value="">No Della-enabled clients</option>}
            {clients.map((c) => <option key={c.id} value={c.id}>{c.businessName}</option>)}
          </select>
        </div>

        {/* Two-Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* LEFT — New Email Request */}
          <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-medium text-[#F2EDE4]">New Email Request</h2>

            <div>
              <label className="block text-xs text-[#8A8070] mb-1.5">Email Type</label>
              <select className={inputCls} value={emailType} onChange={(e) => setEmailType(e.target.value)}>
                {EMAIL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#8A8070] mb-1.5">Recipient Name *</label>
                <input className={inputCls} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Mike Johnson" />
              </div>
              <div>
                <label className="block text-xs text-[#8A8070] mb-1.5">Recipient Email</label>
                <input className={inputCls} type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="mike@example.com" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#8A8070] mb-1.5">Context / Instructions *</label>
              <textarea
                className={inputCls + ' min-h-[140px]'}
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                placeholder="Describe what you need in plain language. Example: Follow up with Johnson about the deck quote from Tuesday. We quoted $2,400 and haven't heard back. Keep it friendly."
              />
            </div>

            <button
              onClick={handleDraft}
              disabled={drafting || !recipientName || !requestNotes}
              className="w-full bg-[#C17B2A] text-white py-3 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {drafting ? 'Della is drafting...' : 'Draft with Della'}
            </button>
          </div>

          {/* RIGHT — Draft Review */}
          <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-6">
            {!activeDraft ? (
              <div className="flex items-center justify-center h-full min-h-[300px]">
                <p className="text-sm text-[#8A8070]/50 text-center">Draft will appear here after you submit your request.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-base font-medium text-[#F2EDE4]">Draft Review</h2>

                <div>
                  <label className="block text-xs text-[#8A8070] mb-1.5">Subject Line</label>
                  <input className={inputCls} value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
                </div>

                <div>
                  <label className="block text-xs text-[#8A8070] mb-1.5">Email Body</label>
                  <textarea className={inputCls + ' min-h-[200px]'} value={editBody} onChange={(e) => setEditBody(e.target.value)} />
                </div>

                <div>
                  <label className="block text-xs text-[#8A8070] mb-1.5">Recipient Email</label>
                  <input className={inputCls} type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Required to send" />
                </div>

                <div className="flex gap-3">
                  <button onClick={handleRegenerate} disabled={drafting} className="flex-1 border border-[rgba(193,123,42,0.3)] text-[#C17B2A] py-2.5 rounded-lg text-sm hover:bg-[rgba(193,123,42,0.1)] transition-colors disabled:opacity-50">
                    {drafting ? 'Regenerating...' : 'Regenerate'}
                  </button>
                  <button
                    onClick={() => setShowConfirm(true)}
                    disabled={!editEmail || sending}
                    className="flex-1 bg-[#C17B2A] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] transition-colors disabled:opacity-40"
                  >
                    Send Email
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Drafts */}
        <div className="bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-6">
          <h2 className="text-base font-medium text-[#F2EDE4] mb-4">Recent Drafts</h2>
          {drafts.length === 0 ? (
            <p className="text-sm text-[#8A8070]/50 text-center py-8">No drafts yet for this client.</p>
          ) : (
            <div className="space-y-2">
              {drafts.slice(0, 10).map((d) => (
                <div key={d.id}>
                  <button
                    onClick={() => setExpandedDraft(expandedDraft === d.id ? null : d.id)}
                    className="w-full text-left bg-[#0E0C0A] rounded-lg px-4 py-3 border border-[rgba(193,123,42,0.1)] hover:border-[rgba(193,123,42,0.25)] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#8A8070] w-20 shrink-0">{new Date(d.createdAt).toLocaleDateString()}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${d.status === 'sent' ? 'bg-green-500/20 text-green-400' : d.status === 'discarded' ? 'bg-red-500/20 text-red-400' : 'bg-[#C17B2A]/20 text-[#C17B2A]'}`}>
                        {d.status}
                      </span>
                      <span className="text-xs text-[#8A8070]">{d.emailType}</span>
                      <span className="text-sm text-[#F2EDE4] flex-1 truncate">{d.recipientName}</span>
                      <span className="text-xs text-[#8A8070] truncate max-w-[200px]">{d.subject}</span>
                    </div>
                  </button>
                  {expandedDraft === d.id && (
                    <div className="bg-[#0E0C0A] border border-[rgba(193,123,42,0.1)] border-t-0 rounded-b-lg px-4 py-4 space-y-3">
                      <div>
                        <p className="text-xs text-[#8A8070] mb-1">Subject</p>
                        <p className="text-sm text-[#F2EDE4]">{d.subject}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#8A8070] mb-1">Body</p>
                        <p className="text-sm text-[#F2EDE4] whitespace-pre-line">{d.body}</p>
                      </div>
                      {d.status === 'sent' && (
                        <button
                          onClick={() => { setActiveDraft(d); setEditSubject(d.subject); setEditBody(d.body); setEditEmail(d.recipientEmail || '') }}
                          className="text-xs text-[#C17B2A] hover:text-[#D4892F] transition-colors"
                        >
                          Resend
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
