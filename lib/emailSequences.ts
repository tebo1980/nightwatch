import { prisma } from './prisma'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://nightwatch.baratrust.com'

// ─── Sequence Types ────────────────────────────────────────────

export type SequenceType =
  | 'ONBOARDING'
  | 'GUARANTEE_AT_RISK'
  | 'GUARANTEE_ACHIEVED'
  | 'TERM_ENDING'
  | 'UPSELL_TRIGGER'
  | 'REFERRAL_REQUEST'

interface SequenceEmail {
  dayOffset: number
  subject: (ctx: EmailContext) => string
  body: (ctx: EmailContext) => string
}

interface EmailContext {
  businessName: string
  ownerFirstName: string
  ownerName: string
  ownerEmail: string
  industry: string
  city: string
  tier: string
  callCount?: number
  healthScore?: number
  guaranteeDaysRemaining?: number | null
  termEndDate?: string
  clientId: string
  unsubscribeUrl: string
}

// ─── Email Templates ───────────────────────────────────────────

const SEQUENCES: Record<SequenceType, SequenceEmail[]> = {
  ONBOARDING: [
    {
      dayOffset: 0,
      subject: (ctx) => `Welcome to BaraTrust, ${ctx.ownerFirstName} — here's what happens next`,
      body: (ctx) => `
        <h2 style="color:#C17B2A;">Welcome aboard, ${ctx.ownerFirstName}!</h2>
        <p>I'm Todd, and I'll be your point of contact at BaraTrust. Here's what we're building for ${ctx.businessName} this week:</p>
        <ul>
          <li><strong>Your Google Business Profile</strong> — optimized for ${ctx.industry} in ${ctx.city}</li>
          <li><strong>Your AI agents</strong> — review monitoring, lead follow-up, and more</li>
          <li><strong>Your Nightwatch dashboard</strong> — live at <a href="${APP_URL}" style="color:#C17B2A;">nightwatch.baratrust.com</a></li>
        </ul>
        <p>Your dashboard will show calls, leads, reviews, and your Business Health Score once data starts flowing in.</p>
        <p>Expect your first report in about 30 days. In the meantime, I'm a text or call away.</p>
        <p>— Todd<br/>502-930-7511</p>`,
    },
    {
      dayOffset: 3,
      subject: (ctx) => `Your presence is live, ${ctx.ownerFirstName} — here's what we launched`,
      body: (ctx) => `
        <h2 style="color:#C17B2A;">Your setup is complete</h2>
        <p>Here's what went live for ${ctx.businessName} this week:</p>
        <ul>
          <li>✅ Google Business Profile optimized</li>
          <li>✅ AI agents activated and monitoring</li>
          <li>✅ Review response drafting enabled</li>
          <li>✅ Lead follow-up sequences configured</li>
        </ul>
        <p>Your dashboard is live: <a href="${APP_URL}" style="color:#C17B2A;">nightwatch.baratrust.com</a></p>
        <p>First week metrics will start appearing soon. I'll send you a quick preview in a few days.</p>
        <p>— Todd</p>`,
    },
    {
      dayOffset: 7,
      subject: (ctx) => `Week 1 complete for ${ctx.businessName} — your first numbers`,
      body: (ctx) => `
        <h2 style="color:#C17B2A;">Week 1 is in the books</h2>
        <p>${ctx.ownerFirstName}, your first week with BaraTrust is done. Here's what we're seeing:</p>
        <ul>
          <li>Your agents are actively monitoring and responding</li>
          <li>Lead follow-up sequences are running</li>
          <li>Your dashboard is tracking everything in real-time</li>
        </ul>
        <p>Check your live dashboard anytime: <a href="${APP_URL}" style="color:#C17B2A;">nightwatch.baratrust.com</a></p>
        <p>This week I'm focusing on optimizing your top traffic sources. Your full monthly report comes at day 30.</p>
        <p>— Todd</p>`,
    },
    {
      dayOffset: 30,
      subject: (ctx) => `Your first monthly report is ready, ${ctx.ownerFirstName}`,
      body: (ctx) => `
        <h2 style="color:#C17B2A;">Month 1 Report Ready</h2>
        <p>${ctx.ownerFirstName}, your first full monthly report for ${ctx.businessName} is ready.</p>
        <p>Check it out on your dashboard: <a href="${APP_URL}" style="color:#C17B2A;">nightwatch.baratrust.com</a></p>
        <p>Your report includes your call count, lead sources, Business Health Score, and what we're optimizing next month.</p>
        <p>I'll follow up with a quick call to walk through it if you'd like. Just let me know.</p>
        <p>— Todd<br/>502-930-7511</p>`,
    },
  ],

  GUARANTEE_AT_RISK: [
    {
      dayOffset: 0,
      subject: (ctx) => `Quick update on your guarantee — ${ctx.businessName}`,
      body: (ctx) => `
        <h2 style="color:#C17B2A;">Honest update on your guarantee</h2>
        <p>${ctx.ownerFirstName}, I want to be transparent with you.</p>
        <p>Your current call count is <strong>${ctx.callCount || 0}</strong> with <strong>${ctx.guaranteeDaysRemaining ?? 'some'} days</strong> left in your guarantee period. Our target is 10 calls.</p>
        <p>Here's what we're doing to accelerate:</p>
        <ul>
          <li>Increasing your Google Business Profile optimization</li>
          <li>Adjusting your ad targeting for higher-intent keywords</li>
          <li>Activating additional lead sources</li>
        </ul>
        <p>No need to panic — I just want you to know exactly where things stand and what we're doing about it.</p>
        <p>— Todd<br/>502-930-7511</p>`,
    },
  ],

  GUARANTEE_ACHIEVED: [
    {
      dayOffset: 0,
      subject: (ctx) => `🎉 Guarantee achieved — ${ctx.businessName} hit 10 calls!`,
      body: (ctx) => `
        <h2 style="color:#22C55E;">🎉 You did it!</h2>
        <p>${ctx.ownerFirstName}, ${ctx.businessName} just hit <strong>10 tracked calls</strong>. Your guarantee is officially met.</p>
        <p>Your total this period: <strong>${ctx.callCount || 10}+ calls</strong></p>
        <p>This is just the beginning. Most of our clients see their best growth in months 2–4 as the optimization compounds.</p>
        <p>Ready to go further? Let's talk about what the next level looks like for ${ctx.businessName}.</p>
        <p>— Todd<br/>502-930-7511</p>`,
    },
  ],

  TERM_ENDING: [
    {
      dayOffset: 0, // 60 days before term end
      subject: (ctx) => `Your BaraTrust term — what's next for ${ctx.businessName}`,
      body: (ctx) => `
        <h2 style="color:#C17B2A;">Your term is coming up</h2>
        <p>${ctx.ownerFirstName}, your BaraTrust term for ${ctx.businessName} ends on <strong>${ctx.termEndDate || 'soon'}</strong>.</p>
        <p>Here's what you've built so far:</p>
        <ul>
          <li>Consistent inbound calls from Google</li>
          <li>AI-powered review management</li>
          <li>Automated lead follow-up</li>
          <li>Business Health Score tracking</li>
        </ul>
        <p>I'd love to talk about renewal options. Loyal clients get preferred pricing.</p>
        <p>Book a quick call: <a href="https://calendly.com/todd-baratrust" style="color:#C17B2A;">calendly.com/todd-baratrust</a></p>
        <p>— Todd</p>`,
    },
    {
      dayOffset: 30, // 30 days before term end
      subject: (ctx) => `30 days left — let's talk renewal, ${ctx.ownerFirstName}`,
      body: (ctx) => `
        <h2 style="color:#C17B2A;">30 days to go</h2>
        <p>${ctx.ownerFirstName}, just a heads up — your term ends in 30 days.</p>
        <p>We've got loyalty pricing ready for you. No pressure, but I want to make sure you don't lose momentum.</p>
        <p>Let's hop on a quick call: <a href="https://calendly.com/todd-baratrust" style="color:#C17B2A;">calendly.com/todd-baratrust</a></p>
        <p>— Todd<br/>502-930-7511</p>`,
    },
    {
      dayOffset: 45, // 15 days before term end
      subject: (ctx) => `Final notice — your BaraTrust term ends soon, ${ctx.ownerFirstName}`,
      body: (ctx) => `
        <h2 style="color:#EF4444;">Your term ends in 15 days</h2>
        <p>${ctx.ownerFirstName}, I want to make sure you have a clear picture of your options:</p>
        <ul>
          <li><strong>Renew:</strong> Keep everything running with loyalty pricing</li>
          <li><strong>Wind down:</strong> We'll help transition your accounts cleanly</li>
        </ul>
        <p>If you don't renew, your Google Business Profile optimization pauses, AI agents go offline, and your dashboard goes dark. All your data stays safe — we just stop working.</p>
        <p>Call me directly: <strong>502-930-7511</strong></p>
        <p>— Todd</p>`,
    },
  ],

  UPSELL_TRIGGER: [
    {
      dayOffset: 0,
      subject: (ctx) => `Your Business Health Score hit 75 — here's what's next`,
      body: (ctx) => `
        <h2 style="color:#22C55E;">Health Score milestone: ${ctx.healthScore || 75}!</h2>
        <p>${ctx.ownerFirstName}, ${ctx.businessName} just crossed 75 on the Business Health Score. That puts you in the top tier of contractors we work with.</p>
        <p>At this level, businesses typically see the biggest ROI from adding:</p>
        <ul>
          <li><strong>Advanced lead scoring</strong> — prioritize your highest-value calls</li>
          <li><strong>Social media automation</strong> — Sage posts to your community pages</li>
          <li><strong>Competitive intelligence</strong> — track what competitors are doing</li>
        </ul>
        <p>Want to see what 80+ looks like? Let's talk about your next move.</p>
        <p>— Todd<br/>502-930-7511</p>`,
    },
  ],

  REFERRAL_REQUEST: [
    {
      dayOffset: 0,
      subject: (ctx) => `Quick favor, ${ctx.ownerFirstName}?`,
      body: (ctx) => `
        <h2 style="color:#C17B2A;">Know anyone like you?</h2>
        <p>${ctx.ownerFirstName}, you've been a great client and I appreciate the trust you've put in us with ${ctx.businessName}.</p>
        <p>Quick favor — do you know any other contractors who could use what we do? A plumber, electrician, roofer — anyone who wants more calls and less hassle.</p>
        <p><strong>Refer a contractor and get a free month on us.</strong></p>
        <p>Just reply with their name and number, or have them text me at 502-930-7511 and mention your name.</p>
        <p>Thanks for being part of this, ${ctx.ownerFirstName}.</p>
        <p>— Todd</p>`,
    },
  ],
}

// ─── Email Wrapper ─────────────────────────────────────────────

function wrapEmail(bodyHtml: string, unsubscribeUrl: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0E0C0A; color: #F2EDE4; padding: 32px;">
      <div style="border-bottom: 2px solid #C17B2A; padding-bottom: 12px; margin-bottom: 24px;">
        <div style="color: #C17B2A; font-size: 18px; font-weight: 600;">BaraTrust</div>
      </div>
      ${bodyHtml}
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid rgba(138,128,112,0.15); text-align: center;">
        <div style="color: #8A8070; font-size: 11px;">
          <a href="${unsubscribeUrl}" style="color: #8A8070; text-decoration: underline;">Unsubscribe from automated emails</a>
          <br/>Powered by BaraTrust Nightwatch
        </div>
      </div>
    </div>`
}

// ─── Trigger a Sequence ────────────────────────────────────────

export async function triggerSequence(
  clientId: string,
  sequenceType: SequenceType,
  extraData?: { callCount?: number; healthScore?: number }
): Promise<{ sent: boolean; reason?: string }> {
  // Load client
  const client = await prisma.agentClient.findUnique({
    where: { id: clientId },
  })

  if (!client) return { sent: false, reason: 'Client not found' }

  // Check opt-out
  if (client.emailOptOut) return { sent: false, reason: 'Client opted out of emails' }

  // Check if already triggered (dedup)
  const triggered = client.sequencesTriggered || []
  if (triggered.includes(sequenceType)) {
    return { sent: false, reason: `Sequence ${sequenceType} already triggered` }
  }

  const sequence = SEQUENCES[sequenceType]
  if (!sequence || sequence.length === 0) {
    return { sent: false, reason: `Unknown sequence: ${sequenceType}` }
  }

  const unsubscribeUrl = `${APP_URL}/api/unsubscribe?clientId=${clientId}`

  const ctx: EmailContext = {
    businessName: client.businessName,
    ownerFirstName: client.ownerFirstName,
    ownerName: client.ownerName,
    ownerEmail: client.ownerEmail,
    industry: client.industry,
    city: client.city,
    tier: client.tier,
    callCount: extraData?.callCount ?? client.guaranteeCallCount,
    healthScore: extraData?.healthScore,
    guaranteeDaysRemaining: client.guaranteeDaysRemaining,
    termEndDate: client.termEndDate?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    clientId,
    unsubscribeUrl,
  }

  // Send only the first email (day 0) immediately.
  // Future emails (day 3, 7, 30, etc.) would be handled by a scheduled job
  // that checks which sequences have been triggered and sends the next email
  // at the appropriate day offset.
  const firstEmail = sequence[0]
  const subject = firstEmail.subject(ctx)
  const bodyHtml = firstEmail.body(ctx)

  try {
    await resend.emails.send({
      from: 'Todd at BaraTrust <todd@baratrust.com>',
      to: client.ownerEmail,
      subject,
      html: wrapEmail(bodyHtml, unsubscribeUrl),
    })

    // Mark sequence as triggered
    await prisma.agentClient.update({
      where: { id: clientId },
      data: {
        sequencesTriggered: [...triggered, sequenceType],
        lastEmailSentAt: new Date(),
      },
    })

    return { sent: true }
  } catch (error) {
    console.error(`Failed to send ${sequenceType} for ${clientId}:`, error)
    return { sent: false, reason: String(error) }
  }
}

// ─── Send follow-up emails for active sequences ────────────────
// Called by a daily cron job to send day 3, 7, 30 emails etc.

export async function processSequenceFollowUps(): Promise<{ sent: number; skipped: number }> {
  let sent = 0
  let skipped = 0

  const clients = await prisma.agentClient.findMany({
    where: {
      active: true,
      emailOptOut: false,
      sequencesTriggered: { isEmpty: false },
    },
  })

  for (const client of clients) {
    const triggered = client.sequencesTriggered || []
    const daysSinceStart = Math.floor(
      (Date.now() - client.startedAt.getTime()) / (1000 * 60 * 60 * 24)
    )

    const unsubscribeUrl = `${APP_URL}/api/unsubscribe?clientId=${client.id}`
    const ctx: EmailContext = {
      businessName: client.businessName,
      ownerFirstName: client.ownerFirstName,
      ownerName: client.ownerName,
      ownerEmail: client.ownerEmail,
      industry: client.industry,
      city: client.city,
      tier: client.tier,
      callCount: client.guaranteeCallCount,
      guaranteeDaysRemaining: client.guaranteeDaysRemaining,
      termEndDate: client.termEndDate?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      clientId: client.id,
      unsubscribeUrl,
    }

    for (const seqType of triggered) {
      const sequence = SEQUENCES[seqType as SequenceType]
      if (!sequence) continue

      for (const email of sequence) {
        if (email.dayOffset === 0) continue // Already sent on trigger

        const sendKey = `${seqType}_DAY${email.dayOffset}`
        if (triggered.includes(sendKey)) {
          skipped++
          continue
        }

        if (daysSinceStart >= email.dayOffset) {
          try {
            await resend.emails.send({
              from: 'Todd at BaraTrust <todd@baratrust.com>',
              to: client.ownerEmail,
              subject: email.subject(ctx),
              html: wrapEmail(email.body(ctx), unsubscribeUrl),
            })

            await prisma.agentClient.update({
              where: { id: client.id },
              data: {
                sequencesTriggered: [...triggered, sendKey],
                lastEmailSentAt: new Date(),
              },
            })

            sent++
          } catch (error) {
            console.error(`Follow-up ${sendKey} for ${client.id} failed:`, error)
          }
        }
      }
    }
  }

  return { sent, skipped }
}
