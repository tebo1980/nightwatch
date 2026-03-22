import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import twilio from 'twilio'
import { Resend } from 'resend'

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
)
const resend = new Resend(process.env.RESEND_API_KEY)

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { estimateId, sendMethod } = body

    if (!estimateId || !sendMethod) {
      return NextResponse.json({ error: 'Missing estimateId or sendMethod' }, { status: 400 })
    }

    if (!['sms', 'email', 'both'].includes(sendMethod)) {
      return NextResponse.json({ error: 'sendMethod must be sms, email, or both' }, { status: 400 })
    }

    const estimate = await prisma.estimate.findUnique({
      where: { id: estimateId },
      include: { boltConfig: true },
    })

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
    }

    const config = estimate.boltConfig
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nightwatch.baratrust.com'
    const approveUrl = `${appUrl}/bolt/approve/${estimate.id}`
    const results: { sms?: boolean; email?: boolean; errors: string[] } = { errors: [] }

    // ─── SMS via Twilio ──────────────────────────────────────────

    if (sendMethod === 'sms' || sendMethod === 'both') {
      try {
        const smsBody = `Hi ${estimate.customerName}, ${config.businessName} sent you an estimate for ${estimate.jobType}. Total: $${fmt(estimate.totalAmount)}. View: ${approveUrl} Valid til ${fmtDate(estimate.validUntil)}. Call ${config.businessPhone} w/ questions.`

        await twilioClient.messages.create({
          body: smsBody,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: estimate.customerPhone,
        })
        results.sms = true
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'SMS failed'
        console.error('Twilio SMS error:', msg)
        results.errors.push(`SMS: ${msg}`)
        results.sms = false
      }
    }

    // ─── Email via Resend ────────────────────────────────────────

    if (sendMethod === 'email' || sendMethod === 'both') {
      if (!estimate.customerEmail) {
        results.errors.push('No customer email address on file.')
        results.email = false
      } else {
        try {
          const desc = estimate.jobDescription.length > 100
            ? estimate.jobDescription.slice(0, 100) + '...'
            : estimate.jobDescription

          await resend.emails.send({
            from: `${config.businessName} via BaraTrust <bolt@baratrust.com>`,
            to: estimate.customerEmail,
            subject: `Your Estimate from ${config.businessName} — ${estimate.jobType} #${estimate.estimateNumber}`,
            html: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="padding: 32px 24px 20px; border-bottom: 3px solid #C17B2A;">
    <h1 style="margin: 0; font-size: 24px; color: #1a1a1a;">${config.businessName}</h1>
  </div>
  <div style="padding: 24px;">
    <p style="font-size: 16px; color: #333; margin: 0 0 8px;">Hi ${estimate.customerName},</p>
    <p style="font-size: 14px; color: #555; margin: 0 0 24px;">Please find your estimate for ${estimate.jobType} below.</p>
    <div style="background: #f8f6f3; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <div style="font-size: 13px; color: #888; margin-bottom: 4px;">Job</div>
      <div style="font-size: 15px; font-weight: 600; color: #1a1a1a; margin-bottom: 8px;">${estimate.jobType}</div>
      <div style="font-size: 13px; color: #666; margin-bottom: 16px;">${desc}</div>
      <div style="font-size: 13px; color: #888; margin-bottom: 4px;">Estimate Total</div>
      <div style="font-size: 28px; font-weight: 700; color: #C17B2A; margin-bottom: 8px;">$${fmt(estimate.totalAmount)}</div>
      <div style="font-size: 13px; color: #666;">Deposit Required: <strong>$${fmt(estimate.depositRequired)}</strong></div>
      <div style="font-size: 13px; color: #666;">Valid Until: <strong>${fmtDate(estimate.validUntil)}</strong></div>
    </div>
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${approveUrl}" style="display: inline-block; background: #C17B2A; color: white; padding: 14px 40px; border-radius: 10px; text-decoration: none; font-size: 16px; font-weight: 600;">VIEW &amp; APPROVE ESTIMATE &rarr;</a>
    </div>
    ${estimate.pdfUrl ? `<p style="text-align: center; font-size: 13px; color: #888;">You can also <a href="${estimate.pdfUrl}" style="color: #C17B2A;">download your PDF estimate here</a>.</p>` : ''}
  </div>
  <div style="padding: 20px 24px; border-top: 1px solid #eee; text-align: center;">
    <p style="font-size: 13px; color: #666; margin: 0 0 4px;">${config.businessName} | ${config.businessPhone} | ${config.businessEmail}</p>
    <p style="font-size: 11px; color: #aaa; margin: 0;">Powered by BaraTrust</p>
  </div>
</div>`,
          })
          results.email = true
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Email failed'
          console.error('Resend email error:', msg)
          results.errors.push(`Email: ${msg}`)
          results.email = false
        }
      }
    }

    // ─── Update estimate status ──────────────────────────────────

    const updated = await prisma.estimate.update({
      where: { id: estimateId },
      data: { status: 'sent', sentAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      estimate: updated,
      sent: { sms: results.sms, email: results.email },
      errors: results.errors.length > 0 ? results.errors : undefined,
    })
  } catch (error) {
    console.error('POST /api/bolt/send error:', error)
    return NextResponse.json({ error: 'Failed to send estimate' }, { status: 500 })
  }
}
