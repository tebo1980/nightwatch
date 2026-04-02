import { NextResponse } from 'next/server'
import { trackReferralClick } from '@/lib/referralProgram'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.json({ error: 'Missing referral code' }, { status: 400 })
  }

  const referral = await trackReferralClick(code)
  if (!referral) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
  }

  // Set referral cookie (30 day expiry) and redirect to homepage
  const response = NextResponse.redirect(new URL('/', request.url))
  response.cookies.set('bt_ref', code, {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })

  return response
}
