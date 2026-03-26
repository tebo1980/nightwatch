import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

let _anthropic: Anthropic | null = null
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic()
  return _anthropic
}

// GET — List reactivation log entries for a client
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

  try {
    const entries = await prisma.estimateReactivation.findMany({
      where: { clientId },
      orderBy: { reactivatedAt: 'desc' },
    })
    return NextResponse.json({ entries })
  } catch (error) {
    console.error('Reactivation GET error:', error)
    return NextResponse.json({ error: 'Failed to load entries' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // ─── Generate reactivation message ────────────────────────
    if (body.action === 'generate') {
      const { clientName, trade, prospectName, jobType, amount, timeAgo, reason, contactMethod } = body

      const systemPrompt = `You are writing reactivation messages for local service businesses. These messages go to prospects who received a quote but never responded or went quiet. The tone must be warm, zero-pressure, and genuinely helpful. Never sound desperate. Never guilt the prospect. The goal is to reopen a door that closed quietly, not to push. Write like a real person checking in, not a sales script.`

      let userPrompt = `Write a ${contactMethod} reactivation message for ${clientName}, a ${trade}. The prospect is ${prospectName}. They received a quote for ${jobType} approximately ${timeAgo}.`
      if (amount?.trim()) userPrompt += ` The quote was around ${amount}.`
      if (reason?.trim()) userPrompt += ` When we last spoke they mentioned ${reason}.`
      userPrompt += ` The message should acknowledge the time that passed naturally, ask a simple open question about whether they still need the work done, and offer to re-quote if anything has changed. Keep it under 100 words for text, under 150 words for email or Facebook. Do not include a subject line unless the contact method is email.`

      const message = await getAnthropic().messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      })

      const text = message.content[0].type === 'text' ? message.content[0].text : ''
      return NextResponse.json({ message: text })
    }

    // ─── Save new reactivation entry ──────────────────────────
    if (body.action === 'save') {
      const { clientId, prospectName, jobType, quoteAmount, quotedAt, contactMethod, outcome, notes } = body
      if (!clientId || !prospectName || !jobType) {
        return NextResponse.json({ error: 'clientId, prospectName, jobType required' }, { status: 400 })
      }
      const entry = await prisma.estimateReactivation.create({
        data: {
          clientId,
          prospectName,
          jobType,
          quoteAmount: quoteAmount || null,
          quotedAt: quotedAt ? new Date(quotedAt) : null,
          contactMethod: contactMethod || 'Text Message',
          outcome: outcome || 'no_response',
          notes: notes || null,
        },
      })
      return NextResponse.json({ entry })
    }

    // ─── Update outcome ───────────────────────────────────────
    if (body.action === 'update_outcome') {
      const { id, outcome, notes } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      const entry = await prisma.estimateReactivation.update({
        where: { id },
        data: { outcome, notes: notes ?? undefined },
      })
      return NextResponse.json({ entry })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Reactivation POST error:', error)
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
  }
}
