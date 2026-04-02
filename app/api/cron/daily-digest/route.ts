import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { runHealthChecks, formatDigestEmail } from '@/lib/healthMonitor'

export const runtime = 'nodejs'
export const maxDuration = 60

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const summary = await runHealthChecks()
    const { subject, html, text } = formatDigestEmail(summary)

    await resend.emails.send({
      from: 'Nightwatch <notifications@baratrust.com>',
      to: 'todd@baratrust.com',
      subject,
      html,
      text,
    })

    return NextResponse.json({
      message: 'Daily digest sent',
      summary: {
        totalClients: summary.totalClients,
        clientsWithAlerts: summary.clientsWithAlerts,
        alertCounts: summary.alertCounts,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Daily digest error:', error)
    return NextResponse.json(
      { error: 'Failed to run health checks', details: String(error) },
      { status: 500 }
    )
  }
}
