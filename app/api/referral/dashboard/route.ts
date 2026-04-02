import { NextResponse } from 'next/server'
import { getOrCreateReferralCode, getReferralStats, recordReferralConversion } from '@/lib/referralProgram'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')

  if (!clientId) {
    return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })
  }

  const stats = await getReferralStats(clientId)
  return NextResponse.json({ stats })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, clientId, code, newClientId } = body

    if (action === 'generate') {
      if (!clientId) return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })
      const referral = await getOrCreateReferralCode(clientId)
      return NextResponse.json({ success: true, referral })
    }

    if (action === 'convert') {
      if (!code || !newClientId) return NextResponse.json({ error: 'Missing code or newClientId' }, { status: 400 })
      const conversion = await recordReferralConversion(code, newClientId)
      if (!conversion) return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
      return NextResponse.json({ success: true, conversion })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed', details: String(error) }, { status: 500 })
  }
}
