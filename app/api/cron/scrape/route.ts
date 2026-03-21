import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nightwatch.baratrust.com'

  const response = await fetch(`${appUrl}/api/scraper/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runAll: true }),
  })

  const result = await response.json()

  return NextResponse.json({
    message: 'Scrape complete',
    ...result,
    timestamp: new Date().toISOString(),
  })
}
