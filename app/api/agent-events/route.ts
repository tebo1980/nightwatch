import { NextResponse } from 'next/server'
import { emitAgentEvent, getRecentEvents } from '@/lib/agentEvents'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId') || undefined
  const agentSource = searchParams.get('agent') || undefined
  const type = searchParams.get('type') || undefined
  const limit = parseInt(searchParams.get('limit') || '50')

  const events = await getRecentEvents({ clientId, agentSource, type, limit })
  return NextResponse.json({ events })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, clientId, agentSource, data } = body

    if (!type || !clientId || !agentSource) {
      return NextResponse.json({ error: 'Missing required fields: type, clientId, agentSource' }, { status: 400 })
    }

    const event = await emitAgentEvent({ type, clientId, agentSource, data: data || {} })
    return NextResponse.json({ success: true, event })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to emit event', details: String(error) }, { status: 500 })
  }
}
