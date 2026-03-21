'use client'

import { useState } from 'react'
import Link from 'next/link'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const YEARS = [2024, 2025, 2026, 2027]
const TIERS = ['Starter', 'Complete']
const SOURCES = ['Google Ads', 'Facebook Ads', 'Google Business Profile', 'Direct', 'Website Organic', 'Other']
const WEAK_CATEGORIES = ['Visibility', 'Lead Capture', 'Profitability', 'Customer Quality', 'Reputation']

const initialForm = {
  clientName: '',
  reportMonth: MONTHS[new Date().getMonth()],
  reportYear: String(new Date().getFullYear()),
  tier: 'Starter',
  totalCallsThisMonth: '',
  totalCallsLastMonth: '',
  guaranteeCallsToDate: '',
  daysRemainingInGuarantee: '',
  topCallSource: SOURCES[0],
  facebookAdSpend: '',
  googleAdSpend: '',
  costPerCall: '',
  bestPerformingAd: '',
  healthScoreThisMonth: '',
  healthScoreLastMonth: '',
  weakestCategory: WEAK_CATEGORIES[0],
  whatWorked: '',
  challenges: '',
  additionalNotes: '',
}

export default function ReportGenerator() {
  const [form, setForm] = useState(initialForm)
  const [report, setReport] = useState('')
  const [generating, setGenerating] = useState(false)
  const [toast, setToast] = useState('')
  const [sheetStatus, setSheetStatus] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    if (!form.clientName || !form.totalCallsThisMonth || !form.healthScoreThisMonth) {
      showToast('Fill in required fields'); return
    }
    setGenerating(true); setReport(''); setSheetStatus('')
    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.report) {
        setReport(data.report)
        showToast('Report generated!')

        // Write to Google Sheet
        try {
          const sheetRes = await fetch('/api/write-to-sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          })
          const sheetResult = await sheetRes.json()
          if (sheetResult.success) {
            setSheetStatus('Data saved to Google Sheet')
          } else {
            setSheetStatus('Report generated but Sheet write failed')
          }
        } catch {
          setSheetStatus('Report generated but Sheet write failed')
        }
      } else {
        showToast(data.error || 'Generation failed')
      }
    } catch { showToast('Error generating report') } finally { setGenerating(false) }
  }

  const resetForm = () => { setForm(initialForm); setReport(''); setSheetStatus('') }

  const inputCls = 'w-full bg-[#0E0C0A] border border-[rgba(193,123,42,0.2)] rounded-lg px-4 py-2.5 text-[#F2EDE4] text-sm focus:outline-none focus:border-[#C17B2A] transition-colors placeholder:text-[#8A8070]/50'
  const labelCls = 'block text-xs text-[#8A8070] mb-1'
  const sectionCls = 'bg-[#1E1B16] border border-[rgba(193,123,42,0.15)] rounded-2xl p-5 space-y-3'

  return (
    <div className="min-h-screen bg-[#0E0C0A] p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        {toast && <div className="fixed top-6 right-6 bg-[#1E1B16] border border-[#C17B2A]/30 text-[#F2EDE4] text-sm px-5 py-3 rounded-lg shadow-lg z-50">{toast}</div>}

        <div className="mb-8">
          <Link href="/" className="text-xs text-[#8A8070] hover:text-[#C17B2A] transition-colors">&larr; Dashboard</Link>
          <h1 className="text-2xl font-semibold text-[#C17B2A] mt-1">Report Generator</h1>
          <p className="text-sm text-[#8A8070]">Monthly Client Performance Reports</p>
        </div>

        {/* Client Info */}
        <div className={`${sectionCls} mb-4`}>
          <h2 className="text-sm font-medium text-[#F2EDE4]">Client Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Client Name *</label>
              <input className={inputCls} placeholder="e.g. Smith Plumbing" value={form.clientName} onChange={(e) => set('clientName', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Subscription Tier</label>
              <select className={inputCls} value={form.tier} onChange={(e) => set('tier', e.target.value)}>
                {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Report Month</label>
              <select className={inputCls} value={form.reportMonth} onChange={(e) => set('reportMonth', e.target.value)}>
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Report Year</label>
              <select className={inputCls} value={form.reportYear} onChange={(e) => set('reportYear', e.target.value)}>
                {YEARS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Call Performance */}
        <div className={`${sectionCls} mb-4`}>
          <h2 className="text-sm font-medium text-[#F2EDE4]">Call Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Total Calls This Month *</label>
              <input className={inputCls} type="number" value={form.totalCallsThisMonth} onChange={(e) => set('totalCallsThisMonth', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Total Calls Last Month</label>
              <input className={inputCls} type="number" value={form.totalCallsLastMonth} onChange={(e) => set('totalCallsLastMonth', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Guarantee Calls to Date <span className="text-[#8A8070]/60">(out of 10)</span></label>
              <input className={inputCls} type="number" value={form.guaranteeCallsToDate} onChange={(e) => set('guaranteeCallsToDate', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Days Remaining in Guarantee</label>
              <input className={inputCls} type="number" value={form.daysRemainingInGuarantee} onChange={(e) => set('daysRemainingInGuarantee', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Top Call Source</label>
              <select className={inputCls} value={form.topCallSource} onChange={(e) => set('topCallSource', e.target.value)}>
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Ad Performance */}
        <div className={`${sectionCls} mb-4`}>
          <h2 className="text-sm font-medium text-[#F2EDE4]">Ad Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Facebook Ad Spend</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-[#8A8070]">$</span>
                <input className={`${inputCls} pl-7`} type="number" step="0.01" value={form.facebookAdSpend} onChange={(e) => set('facebookAdSpend', e.target.value)} />
              </div>
            </div>
            {form.tier === 'Complete' && (
              <div>
                <label className={labelCls}>Google Ad Spend</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-[#8A8070]">$</span>
                  <input className={`${inputCls} pl-7`} type="number" step="0.01" value={form.googleAdSpend} onChange={(e) => set('googleAdSpend', e.target.value)} />
                </div>
              </div>
            )}
            <div>
              <label className={labelCls}>Cost Per Call</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-[#8A8070]">$</span>
                <input className={`${inputCls} pl-7`} type="number" step="0.01" value={form.costPerCall} onChange={(e) => set('costPerCall', e.target.value)} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Best Performing Ad <span className="text-[#8A8070]/60">(optional)</span></label>
              <input className={inputCls} value={form.bestPerformingAd} onChange={(e) => set('bestPerformingAd', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Health Score */}
        <div className={`${sectionCls} mb-4`}>
          <h2 className="text-sm font-medium text-[#F2EDE4]">Health Score</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Score This Month * <span className="text-[#8A8070]/60">(0-100)</span></label>
              <input className={inputCls} type="number" min="0" max="100" value={form.healthScoreThisMonth} onChange={(e) => set('healthScoreThisMonth', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Score Last Month <span className="text-[#8A8070]/60">(0-100)</span></label>
              <input className={inputCls} type="number" min="0" max="100" value={form.healthScoreLastMonth} onChange={(e) => set('healthScoreLastMonth', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Weakest Category</label>
              <select className={inputCls} value={form.weakestCategory} onChange={(e) => set('weakestCategory', e.target.value)}>
                {WEAK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Context */}
        <div className={`${sectionCls} mb-6`}>
          <h2 className="text-sm font-medium text-[#F2EDE4]">Context</h2>
          <div>
            <label className={labelCls}>What worked well this month *</label>
            <textarea className={`${inputCls} min-h-[80px]`} value={form.whatWorked} onChange={(e) => set('whatWorked', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Challenges or issues <span className="text-[#8A8070]/60">(optional)</span></label>
            <textarea className={`${inputCls} min-h-[60px]`} value={form.challenges} onChange={(e) => set('challenges', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Anything else to include <span className="text-[#8A8070]/60">(optional)</span></label>
            <textarea className={`${inputCls} min-h-[60px]`} value={form.additionalNotes} onChange={(e) => set('additionalNotes', e.target.value)} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-6">
          <button onClick={handleSubmit} disabled={generating} className="bg-[#C17B2A] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#D4892F] disabled:opacity-40 transition-colors">
            {generating ? 'Generating...' : 'Generate Report'}
          </button>
          <button onClick={resetForm} className="border border-[rgba(193,123,42,0.3)] text-[#8A8070] px-5 py-2.5 rounded-lg text-sm hover:text-[#F2EDE4] transition-colors">
            Reset Form
          </button>
        </div>

        {/* Report Output */}
        {report && (
          <div className={`${sectionCls} mb-8`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-[#F2EDE4]">Generated Report</h2>
              <button
                onClick={() => navigator.clipboard.writeText(report).then(() => showToast('Copied to clipboard!'))}
                className="text-xs text-[#C17B2A] hover:text-[#D4892F] transition-colors"
              >
                Copy to Clipboard
              </button>
            </div>
            <textarea
              className={`${inputCls} min-h-[320px] leading-relaxed`}
              value={report}
              onChange={(e) => setReport(e.target.value)}
            />
            {sheetStatus && (
              <p className={`text-xs mt-2 ${sheetStatus.startsWith('Data saved') ? 'text-green-400' : 'text-[#C17B2A]'}`}>
                {sheetStatus}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
