import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

let _anthropic: Anthropic | null = null
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic()
  return _anthropic
}

export async function POST(req: NextRequest) {
  try {
    const { clientName, businessName, trade, tier, portalLink, calendlyLink, activeAgents } = await req.json()

    if (!clientName || !businessName || !trade || !tier) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const systemPrompt = `You are Todd Tebo, founder of BaraTrust, writing a welcome email to a new client. Your voice is warm, plain spoken, and genuinely excited without being over the top. You write like a real person, not a company. The email should make the client feel like they made the right decision, tell them exactly what happens next, introduce their active AI agents by name in a human way, and give them their portal link. Never use corporate language. Never use phrases like "we are thrilled" or "it is our pleasure." Write like Todd.`

    const agentList = (activeAgents || []).join(', ') || 'your full AI staff'

    const userPrompt = `Write a welcome email for ${clientName} at ${businessName}, a ${trade} on the ${tier} plan. Their active agents are ${agentList}. Their portal link is ${portalLink || '[portal link]'}. ${calendlyLink ? `Todd's Calendly for onboarding calls is ${calendlyLink}.` : ''} Include what happens in the first 7 days, introduce each active agent in one warm sentence, and end with Todd's direct number 502-431-3285 and a reminder that they can text anytime.

IMPORTANT: Start your response with SUBJECT: followed by the email subject line on its own line. Then write the email body below it.`

    const message = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const fullText = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ fullText })
  } catch (error) {
    console.error('Welcome email error:', error)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
