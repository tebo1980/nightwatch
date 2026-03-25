import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

let _anthropic: Anthropic | null = null
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic()
  return _anthropic
}

// GET — Load checklist state for a client
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

  try {
    const client = await prisma.agentClient.findUnique({
      where: { id: clientId },
      select: { id: true, businessName: true, industry: true, city: true, state: true, ownerName: true },
    })
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const items = await prisma.gbpChecklist.findMany({ where: { clientId } })

    return NextResponse.json({ client, items })
  } catch (error) {
    console.error('GBP GET error:', error)
    return NextResponse.json({ error: 'Failed to load checklist' }, { status: 500 })
  }
}

// POST — Toggle a checklist item or generate a post
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // ─── Generate Google Post ─────────────────────────────────
    if (body.action === 'generate_post') {
      const { clientName, trade, neighborhood, jobType, description, beforeAfter } = body

      const systemPrompt = `You are a local SEO content writer for BaraTrust. You write Google Business Profile posts for local service businesses. Posts should be 150 to 250 words, written in a warm plain spoken voice, include the neighborhood and job type naturally for local SEO, end with a soft call to action, and never sound like corporate marketing copy. Always write in third person about the business.`

      let userPrompt = `Write a Google Business Profile post for ${clientName}, a ${trade} serving ${neighborhood}. They recently completed: ${jobType}. Here are the details: ${description}.`
      if (beforeAfter?.trim()) {
        userPrompt += ` Before and after: ${beforeAfter}.`
      }

      const message = await getAnthropic().messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      })

      const post = message.content[0].type === 'text' ? message.content[0].text : ''
      return NextResponse.json({ post })
    }

    // ─── Toggle checklist item ────────────────────────────────
    const { clientId, itemKey, completed } = body
    if (!clientId || !itemKey) {
      return NextResponse.json({ error: 'clientId and itemKey required' }, { status: 400 })
    }

    const item = await prisma.gbpChecklist.upsert({
      where: { clientId_itemKey: { clientId, itemKey } },
      update: {
        completed,
        completedAt: completed ? new Date() : null,
      },
      create: {
        clientId,
        itemKey,
        completed,
        completedAt: completed ? new Date() : null,
      },
    })

    return NextResponse.json({ item })
  } catch (error) {
    console.error('GBP POST error:', error)
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
  }
}
