import { prisma } from './prisma'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// ─── Generate referral code ────────────────────────────────────

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I, O, 0, 1 for clarity
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// ─── Create or get referral code for a client ──────────────────

export async function getOrCreateReferralCode(clientId: string) {
  const existing = await prisma.referralCode.findUnique({
    where: { clientId },
  })
  if (existing) return existing

  // Generate unique code
  let code = generateCode()
  let attempts = 0
  while (attempts < 10) {
    const conflict = await prisma.referralCode.findUnique({ where: { code } })
    if (!conflict) break
    code = generateCode()
    attempts++
  }

  return prisma.referralCode.create({
    data: { clientId, code },
  })
}

// ─── Track a referral click ────────────────────────────────────

export async function trackReferralClick(code: string) {
  const referral = await prisma.referralCode.findUnique({
    where: { code },
  })
  if (!referral) return null

  await prisma.referralCode.update({
    where: { code },
    data: { clicks: { increment: 1 } },
  })

  return referral
}

// ─── Record a conversion ──────────────────────────────────────

export async function recordReferralConversion(code: string, newClientId: string) {
  const referral = await prisma.referralCode.findUnique({
    where: { code },
    include: { client: true },
  })
  if (!referral) return null

  // Create conversion record
  const conversion = await prisma.referralConversion.create({
    data: {
      referralCodeId: referral.id,
      newClientId,
    },
  })

  // Update referral stats
  await prisma.referralCode.update({
    where: { code },
    data: {
      conversions: { increment: 1 },
      creditsEarned: { increment: 1 },
    },
  })

  // Send notification to referring client
  try {
    await resend.emails.send({
      from: 'Todd at BaraTrust <todd@baratrust.com>',
      to: referral.client.ownerEmail,
      subject: `Your referral signed up — your next month is on us!`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0E0C0A; color: #F2EDE4; padding: 32px;">
          <div style="border-bottom: 2px solid #C17B2A; padding-bottom: 12px; margin-bottom: 24px;">
            <div style="color: #C17B2A; font-size: 18px; font-weight: 600;">BaraTrust</div>
          </div>
          <h2 style="color: #22C55E;">🎉 Your referral signed up!</h2>
          <p>${referral.client.ownerFirstName}, great news — someone you referred just became a BaraTrust client.</p>
          <p><strong>Your reward: 1 free month credit</strong> has been applied to your account. It'll automatically come off your next invoice.</p>
          <p>You now have <strong>${referral.creditsEarned + 1} total credits earned</strong>.</p>
          <p>Keep sharing your referral link — every signup earns you another free month:</p>
          <div style="background: #1E1B16; border: 1px solid rgba(193,123,42,0.3); border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
            <code style="color: #C17B2A; font-size: 16px;">baratrust.com/?ref=${referral.code}</code>
          </div>
          <p>— Todd<br/>502-930-7511</p>
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(138,128,112,0.15); text-align: center; color: #8A8070; font-size: 11px;">
            Powered by BaraTrust Nightwatch
          </div>
        </div>`,
    })
  } catch (error) {
    console.error('Failed to send referral notification:', error)
  }

  return conversion
}

// ─── Get referral stats for a client ──────────────────────────

export async function getReferralStats(clientId: string) {
  const referral = await prisma.referralCode.findUnique({
    where: { clientId },
    include: { referrals: true },
  })

  if (!referral) return null

  return {
    code: referral.code,
    link: `baratrust.com/?ref=${referral.code}`,
    clicks: referral.clicks,
    conversions: referral.conversions,
    creditsEarned: referral.creditsEarned,
    referrals: referral.referrals,
  }
}
