import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')

  if (!clientId) {
    return new Response('Missing clientId', { status: 400 })
  }

  try {
    await prisma.agentClient.update({
      where: { id: clientId },
      data: { emailOptOut: true },
    })

    // Return a simple HTML confirmation page
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>Unsubscribed</title></head>
      <body style="font-family: -apple-system, sans-serif; background: #0E0C0A; color: #F2EDE4; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
        <div style="text-align: center; max-width: 400px; padding: 40px;">
          <div style="font-size: 48px; margin-bottom: 16px;">✓</div>
          <h1 style="color: #C17B2A; font-size: 20px;">You've been unsubscribed</h1>
          <p style="color: #8A8070; font-size: 14px; line-height: 1.6;">
            You'll no longer receive automated emails from BaraTrust Nightwatch.
            If you'd like to re-subscribe, just let Todd know.
          </p>
          <p style="color: #8A8070; font-size: 13px; margin-top: 24px;">502-930-7511 | todd@baratrust.com</p>
        </div>
      </body>
      </html>`

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    })
  } catch {
    return new Response('Unable to process unsubscribe request', { status: 500 })
  }
}
