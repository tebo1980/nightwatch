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

export async function POST(req: NextRequest) {
  try {
    const { estimateId, action, changeMessage } = await req.json()

    if (!estimateId || !action) {
      return NextResponse.json({ error: 'Missing estimateId or action' }, { status: 400 })
    }

    const estimate = await prisma.estimate.findUnique({
      where: { id: estimateId },
      include: { boltConfig: true },
    })

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
    }

    const config = estimate.boltConfig

    // ─── APPROVE ──────────────────────────────────────────────────

    if (action === 'approve') {
      await prisma.estimate.update({
        where: { id: estimateId },
        data: { status: 'approved', approvedAt: new Date() },
      })

      // Notify contractor via SMS
      try {
        await twilioClient.messages.create({
          body: `⚡ Bolt Alert: ${estimate.customerName} approved the ${estimate.jobType} estimate for $${fmt(estimate.totalAmount)}. Time to schedule! 🎉`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: config.businessPhone,
        })
      } catch (err) {
        console.error('Approval SMS to contractor failed:', err)
      }

      // Notify contractor via email
      try {
        await resend.emails.send({
          from: `Bolt at BaraTrust <bolt@baratrust.com>`,
          to: config.businessEmail,
          subject: `✅ Estimate Approved — ${estimate.customerName} — #${estimate.estimateNumber}`,
          html: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="padding: 24px; border-bottom: 3px solid #22c55e;">
    <h1 style="margin: 0; font-size: 20px; color: #1a1a1a;">&#9989; Estimate Approved</h1>
  </div>
  <div style="padding: 24px;">
    <p style="font-size: 15px; color: #333;"><strong>${estimate.customerName}</strong> approved your estimate for <strong>${estimate.jobType}</strong>.</p>
    <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <div style="font-size: 24px; font-weight: 700; color: #22c55e;">$${fmt(estimate.totalAmount)}</div>
      <div style="font-size: 13px; color: #666; margin-top: 4px;">Estimate #${estimate.estimateNumber}</div>
    </div>
    <p style="font-size: 14px; color: #555;">Customer: ${estimate.customerName}<br/>Phone: ${estimate.customerPhone}<br/>Address: ${estimate.customerAddress}</p>
    <p style="font-size: 14px; color: #333; font-weight: 600;">Time to schedule the job! &#127881;</p>
  </div>
  <div style="padding: 16px 24px; border-top: 1px solid #eee; text-align: center;">
    <p style="font-size: 11px; color: #aaa; margin: 0;">Powered by BaraTrust</p>
  </div>
</div>`,
        })
      } catch (err) {
        console.error('Approval email to contractor failed:', err)
      }

      return NextResponse.json({ success: true, status: 'approved' })
    }

    // ─── REQUEST CHANGES ─────────────────────────────────────────

    if (action === 'request-changes') {
      await prisma.estimate.update({
        where: { id: estimateId },
        data: { status: 'changes-requested' },
      })

      // Send change request email to contractor
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nightwatch.baratrust.com'
        await resend.emails.send({
          from: `Bolt at BaraTrust <bolt@baratrust.com>`,
          to: config.businessEmail,
          subject: `Estimate Change Request — ${estimate.customerName} — #${estimate.estimateNumber}`,
          html: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="padding: 24px; border-bottom: 3px solid #C17B2A;">
    <h1 style="margin: 0; font-size: 20px; color: #1a1a1a;">&#9998; Change Request</h1>
  </div>
  <div style="padding: 24px;">
    <p style="font-size: 15px; color: #333;"><strong>${estimate.customerName}</strong> has requested changes to estimate <strong>#${estimate.estimateNumber}</strong> for <strong>${estimate.jobType}</strong>.</p>
    <div style="background: #fff8f0; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #C17B2A;">
      <div style="font-size: 13px; color: #888; margin-bottom: 4px;">Customer Message:</div>
      <div style="font-size: 14px; color: #333;">${changeMessage || 'No details provided.'}</div>
    </div>
    <p style="font-size: 14px; color: #555;">Estimate Amount: <strong>$${fmt(estimate.totalAmount)}</strong></p>
    <p style="font-size: 14px; color: #555;">Customer Phone: ${estimate.customerPhone}</p>
    <div style="text-align: center; margin-top: 20px;">
      <a href="${appUrl}/bolt" style="display: inline-block; background: #C17B2A; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">View in Bolt Dashboard</a>
    </div>
  </div>
  <div style="padding: 16px 24px; border-top: 1px solid #eee; text-align: center;">
    <p style="font-size: 11px; color: #aaa; margin: 0;">Powered by BaraTrust</p>
  </div>
</div>`,
        })
      } catch (err) {
        console.error('Change request email failed:', err)
      }

      return NextResponse.json({ success: true, status: 'changes-requested' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('POST /api/bolt/approve error:', error)
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
  }
}
