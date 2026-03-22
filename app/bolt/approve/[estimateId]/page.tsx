'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface EstimateData {
  id: string
  estimateNumber: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  customerAddress: string
  jobType: string
  jobDescription: string
  totalAmount: number
  depositRequired: number
  validUntil: string
  status: string
  pdfUrl: string | null
  boltConfig: {
    businessName: string
    businessPhone: string
    businessEmail: string
    paymentTerms: string
  }
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ApprovalPage() {
  const params = useParams()
  const estimateId = params.estimateId as string

  const [estimate, setEstimate] = useState<EstimateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [processing, setProcessing] = useState(false)
  const [showChanges, setShowChanges] = useState(false)
  const [changeMessage, setChangeMessage] = useState('')
  const [result, setResult] = useState<'approved' | 'changes-requested' | null>(null)

  useEffect(() => {
    fetch(`/api/bolt/estimates/${estimateId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.estimate) {
          setEstimate(data.estimate)
        } else {
          setNotFound(true)
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [estimateId])

  async function handleApprove() {
    setProcessing(true)
    try {
      const res = await fetch('/api/bolt/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimateId, action: 'approve' }),
      })
      if (res.ok) setResult('approved')
    } catch { /* */ } finally { setProcessing(false) }
  }

  async function handleRequestChanges() {
    if (!changeMessage.trim()) return
    setProcessing(true)
    try {
      const res = await fetch('/api/bolt/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimateId, action: 'request-changes', changeMessage }),
      })
      if (res.ok) setResult('changes-requested')
    } catch { /* */ } finally { setProcessing(false) }
  }

  // ─── Loading ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    )
  }

  // ─── Not found ──────────────────────────────────────────────────
  if (notFound || !estimate) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-gray-800 text-lg font-medium mb-2">This estimate link is no longer active.</p>
          <p className="text-gray-500 text-sm">Please contact the business directly if you have questions.</p>
        </div>
      </div>
    )
  }

  const config = estimate.boltConfig

  // ─── Already approved ──────────────────────────────────────────
  if (estimate.status === 'approved' && !result) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">&#9989;</div>
          <p className="text-gray-800 text-lg font-medium mb-2">This estimate has already been approved.</p>
          <p className="text-gray-500 text-sm">{config.businessName} will be in touch to schedule your job.</p>
        </div>
      </div>
    )
  }

  // ─── Approved result ───────────────────────────────────────────
  if (result === 'approved') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">&#9989;</div>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Thank you, {estimate.customerName}!</h1>
          <p className="text-gray-500 text-sm">{config.businessName} has been notified and will contact you shortly to schedule your job.</p>
        </div>
      </div>
    )
  }

  // ─── Changes requested result ──────────────────────────────────
  if (result === 'changes-requested') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">&#9989;</div>
          <h1 className="text-lg font-medium text-gray-800 mb-2">Your request has been sent to {config.businessName}.</h1>
          <p className="text-gray-500 text-sm">They will be in touch shortly.</p>
        </div>
      </div>
    )
  }

  // ─── Main approval view ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-semibold text-gray-800">{config.businessName}</h1>
          <p className="text-xs text-gray-500">Estimate #{estimate.estimateNumber}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Summary card */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Job</div>
          <div className="text-base font-semibold text-gray-800 mb-1">{estimate.jobType}</div>
          <div className="text-sm text-gray-600 mb-4">{estimate.jobDescription}</div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-sm text-gray-500">Total</span>
              <span className="text-2xl font-bold" style={{ color: '#C17B2A' }}>${fmt(estimate.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Deposit Required</span>
              <span className="text-gray-800 font-medium">${fmt(estimate.depositRequired)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Valid Until</span>
              <span className="text-gray-800">{new Date(estimate.validUntil).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* PDF link */}
        {estimate.pdfUrl && (
          <a
            href={estimate.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-sm font-medium py-3 rounded-xl border"
            style={{ color: '#C17B2A', borderColor: 'rgba(193,123,42,0.3)' }}
          >
            View Full Estimate PDF
          </a>
        )}

        {/* Terms notice */}
        <p className="text-xs text-gray-400 text-center px-4">
          By approving you agree to the payment terms and deposit requirement stated in this estimate.
        </p>

        {/* Change request form */}
        {showChanges ? (
          <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-800">What would you like to change?</h3>
            <textarea
              value={changeMessage}
              onChange={(e) => setChangeMessage(e.target.value)}
              rows={3}
              placeholder="Please describe what you'd like adjusted..."
              className="w-full border rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleRequestChanges}
                disabled={processing || !changeMessage.trim()}
                className="flex-1 bg-gray-800 text-white py-3 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {processing ? 'Sending...' : 'Send Request'}
              </button>
              <button
                onClick={() => { setShowChanges(false); setChangeMessage('') }}
                className="px-4 py-3 rounded-xl text-sm text-gray-500 border"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleApprove}
              disabled={processing}
              className="w-full text-white py-4 rounded-xl text-base font-semibold disabled:opacity-50"
              style={{ backgroundColor: '#22c55e' }}
            >
              {processing ? 'Processing...' : '\u2705 Approve This Estimate'}
            </button>
            <button
              onClick={() => setShowChanges(true)}
              className="w-full border py-4 rounded-xl text-base font-medium text-gray-600"
            >
              &#9998;&#65039; Request Changes
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4 pb-8">
          <p className="text-xs text-gray-400">{config.businessName} | {config.businessPhone}</p>
          <p className="text-[10px] text-gray-300 mt-1">Powered by BaraTrust</p>
        </div>
      </div>
    </div>
  )
}
