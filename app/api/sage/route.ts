import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clientId, businessUpdate, tone, platforms, postsPerPlatform, keywords } = body

    if (!clientId || !businessUpdate || !platforms?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const client = await prisma.agentClient.findUnique({ where: { id: clientId } })
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const systemPrompt = `You are Sage, BaraTrust's social media drafting agent. You write social media posts for local service businesses. Your job is to create posts that sound like they came from a real local business owner — warm, honest, community-focused, never corporate or salesy. You know the business well and you write like a neighbor, not a marketer.

Always write in active voice. Use simple words. Keep posts conversational. For Google Business Profile posts keep them under 1500 characters. For Facebook aim for 100–250 words. For Instagram keep captions under 150 words and include relevant hashtags at the end.

Never use emojis excessively — one or two per post maximum unless the tone is Friendly and Casual, in which case up to four is acceptable. Never use corporate buzzwords like 'solutions', 'leverage', 'synergy', or 'best-in-class'.`

    const userPrompt = `Draft social media posts for ${client.businessName}, a ${client.industry} business in ${client.city}, ${client.state}.

Business update for this week: ${businessUpdate}

Tone: ${tone || 'Friendly and Casual'}

Platforms requested: ${platforms.join(', ')}

Posts per platform: ${postsPerPlatform || 3}

${keywords ? `Keywords or hashtags to include: ${keywords}` : ''}

For each platform, number the posts clearly and label the platform.

Format your response as:

${platforms.includes('Facebook') ? 'FACEBOOK\nPost 1:\n[post text]\n\nPost 2:\n[post text]\n\n' : ''}${platforms.includes('Instagram') ? 'INSTAGRAM\nPost 1:\n[post text]\n\nPost 2:\n[post text]\n\n' : ''}${platforms.includes('Google Business Profile') ? 'GOOGLE BUSINESS PROFILE\nPost 1:\n[post text]\n\nPost 2:\n[post text]\n\n' : ''}
Write every post fully. Do not summarize or use placeholders.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const content = message.content[0].type === 'text' ? message.content[0].text : ''

    return NextResponse.json({ success: true, content })
  } catch (error) {
    console.error('Sage error:', error)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
