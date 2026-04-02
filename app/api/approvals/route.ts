import { NextResponse } from 'next/server'
import { getPendingApprovals, handleApproval } from '@/lib/agentEvents'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId') || undefined

  const items = await getPendingApprovals(clientId)
  return NextResponse.json({ items })
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { itemId, action, editedContent } = body

    if (!itemId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Missing itemId or invalid action' }, { status: 400 })
    }

    const result = await handleApproval(itemId, action, editedContent)
    if (!result) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, item: result })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process approval', details: String(error) }, { status: 500 })
  }
}
