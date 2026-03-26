import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

let _anthropic: Anthropic | null = null
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic()
  return _anthropic
}

export async function POST(req: NextRequest) {
  try {
    const { clientName, trade, neighborhood, jobType, description, customerName } = await req.json()

    if (!clientName || !trade || !neighborhood || !jobType || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const systemPrompt = `You are a community content writer for BaraTrust. You write hyperlocal social posts for contractors that sound like a helpful neighbor sharing a story, never like an advertisement. Posts should build trust, mention the specific neighborhood, and end with a soft availability note. Never use exclamation points excessively. Never sound salesy.`

    let userPrompt = `Generate two posts for ${clientName}, a ${trade} in the ${neighborhood} area. They just completed: ${jobType}. Details: ${description}.`
    if (customerName?.trim()) {
      userPrompt += ` The customer's name is ${customerName} and has given permission to be mentioned.`
    }
    userPrompt += `

Post 1 should be formatted for Nextdoor — warm, neighborly, 100 to 150 words, written as if the contractor is a neighbor sharing good news, ending with something like "Happy to help anyone in ${neighborhood} with ${trade} needs."

Post 2 should be formatted for a neighborhood Facebook group — slightly more casual, 80 to 120 words, suitable for posting in a local community group without sounding like spam. Include a note at the top of the post that says something like "Mod approved — sharing a recent job in the neighborhood."

Separate the two posts with the exact text: ---SPLIT---`

    const message = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const fullText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Split into two posts
    const parts = fullText.split('---SPLIT---')
    const nextdoorPost = (parts[0] || '').trim()
    const facebookPost = (parts[1] || '').trim()

    return NextResponse.json({ nextdoorPost, facebookPost })
  } catch (error) {
    console.error('Neighborhood posts error:', error)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
