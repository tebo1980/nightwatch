import { NextResponse } from 'next/server'
import { runHealthChecks } from '@/lib/healthMonitor'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST() {
  try {
    const summary = await runHealthChecks()
    return NextResponse.json({ success: true, summary })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      { error: 'Failed to run health checks', details: String(error) },
      { status: 500 }
    )
  }
}
