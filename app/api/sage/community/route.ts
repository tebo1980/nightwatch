import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

let _anthropic: Anthropic | null = null
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic()
  return _anthropic
}

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId')
  const type = req.nextUrl.searchParams.get('type') // 'rules' or 'templates'

  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

  try {
    if (type === 'rules') {
      const rules = await prisma.groupRules.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({ rules })
    }

    if (type === 'templates') {
      let templates = await prisma.groupResponseTemplate.findMany({
        where: { clientId },
        orderBy: { createdAt: 'asc' },
      })

      // Seed defaults if empty
      if (templates.length === 0) {
        const defaults = [
          {
            clientId,
            templateName: 'Recommendation Response',
            platform: 'Nextdoor',
            templateText: 'Thanks so much [neighbor name] — really appreciate you thinking of us. We\'ve done a lot of work in [neighborhood] and always love taking care of our neighbors. Happy to take a look anytime — just give us a call or text at [phone].',
          },
          {
            clientId,
            templateName: 'Referral Request Response',
            platform: 'Facebook Group',
            templateText: 'Hey [name] — we\'d love to help. We\'re [clientName] and we\'ve been serving [neighborhood] for [years] years. Give us a call at [phone] and we\'ll get you taken care of. No pressure at all — just want to make sure you get it handled right.',
          },
          {
            clientId,
            templateName: 'Negative Comment Response',
            platform: 'Any',
            templateText: 'Hi [name] — we\'re sorry to hear this wasn\'t the experience you expected. We take every job seriously and want to make this right. Please reach out to us directly at [phone] or [email] so we can talk through what happened.',
          },
        ]
        for (const d of defaults) {
          await prisma.groupResponseTemplate.create({ data: d })
        }
        templates = await prisma.groupResponseTemplate.findMany({
          where: { clientId },
          orderBy: { createdAt: 'asc' },
        })
      }

      return NextResponse.json({ templates })
    }

    return NextResponse.json({ error: 'type param required (rules or templates)' }, { status: 400 })
  } catch (error) {
    console.error('Community GET error:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // ─── Generate post ────────────────────────────────────────
    if (body.action === 'generate_post') {
      const { clientName, trade, neighborhood, postType, details, tone } = body

      const systemPrompt = `You are a community content specialist for BaraTrust. You write hyperlocal posts for contractors that are indistinguishable from a helpful neighbor sharing genuine value. You never write ads. You never use exclamation points more than once per post. You never use phrases like "excited to announce" or "proud to serve." You write like a real person who lives in the neighborhood and happens to know a lot about their trade. Every post should feel like it belongs in the community, not like it was placed there by a marketing agency.`

      const userPrompt = `Write a ${postType} post for ${clientName}, a ${trade} in the ${neighborhood} area. Context: ${details}. Use a ${tone} voice. The post should be 100 to 150 words, feel completely organic to the platform, and end with a natural soft availability note rather than a call to action.`

      const message = await getAnthropic().messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      })

      const post = message.content[0].type === 'text' ? message.content[0].text : ''
      return NextResponse.json({ post })
    }

    // ─── Save group rules ─────────────────────────────────────
    if (body.action === 'save_rules') {
      const { clientId, groupName, platform, allowedPostFrequency, promoThread, bannedBehaviors, notes } = body
      if (!clientId || !groupName || !platform) {
        return NextResponse.json({ error: 'clientId, groupName, platform required' }, { status: 400 })
      }
      const rule = await prisma.groupRules.create({
        data: { clientId, groupName, platform, allowedPostFrequency, promoThread: promoThread || false, bannedBehaviors, notes },
      })
      return NextResponse.json({ rule })
    }

    // ─── Delete group rules ───────────────────────────────────
    if (body.action === 'delete_rules') {
      await prisma.groupRules.delete({ where: { id: body.id } })
      return NextResponse.json({ success: true })
    }

    // ─── Save template ────────────────────────────────────────
    if (body.action === 'save_template') {
      const { clientId, templateName, platform, templateText } = body
      if (!clientId || !templateName || !templateText) {
        return NextResponse.json({ error: 'clientId, templateName, templateText required' }, { status: 400 })
      }
      const template = await prisma.groupResponseTemplate.create({
        data: { clientId, templateName, platform: platform || 'Any', templateText },
      })
      return NextResponse.json({ template })
    }

    // ─── Update template ──────────────────────────────────────
    if (body.action === 'update_template') {
      const { id, templateText } = body
      const template = await prisma.groupResponseTemplate.update({
        where: { id },
        data: { templateText },
      })
      return NextResponse.json({ template })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Community POST error:', error)
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
  }
}
