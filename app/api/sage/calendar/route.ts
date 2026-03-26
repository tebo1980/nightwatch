import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

let _anthropic: Anthropic | null = null
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic()
  return _anthropic
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // ─── Storm / Event Response ───────────────────────────────
    if (body.action === 'storm_response') {
      const { clientName, trade, serviceArea, event } = body
      if (!clientName || !trade || !event) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      const systemPrompt = `You are a community content strategist for BaraTrust. You write hyperlocal social posts for local service businesses. All content should sound like a helpful neighbor, never a brand. Write in plain spoken conversational language. Never sound salesy.`

      const userPrompt = `Something just happened locally that a ${trade} serving ${serviceArea || 'the area'} should respond to: ${event}

Write two immediate response posts for ${clientName}:

Post 1 — For Nextdoor: warm, helpful, 80 to 120 words. Offer help or awareness without being opportunistic. Sound like a concerned neighbor who happens to be a ${trade}.

Post 2 — For a neighborhood Facebook group: casual, 60 to 100 words. Same tone but slightly shorter. Start with a note like "Hey neighbors —" or similar.

Separate the two posts with the exact text: ---SPLIT---`

      const message = await getAnthropic().messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      })

      const fullText = message.content[0].type === 'text' ? message.content[0].text : ''
      const parts = fullText.split('---SPLIT---')

      return NextResponse.json({
        nextdoorPost: (parts[0] || '').trim(),
        facebookPost: (parts[1] || '').trim(),
      })
    }

    // ─── Monthly Calendar Generation ──────────────────────────
    const { clientName, trade, serviceArea, month, year, triggers } = body

    if (!clientName || !trade || !serviceArea || !month || !year) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const systemPrompt = `You are a community content strategist for BaraTrust. You create monthly social media content calendars for local service businesses. All content should sound like a helpful neighbor, never a brand. Posts should be educational, locally relevant, and occasionally reference real seasonal or community triggers. Content is designed for Nextdoor, neighborhood Facebook groups, and the business's own Facebook and Instagram pages. Never write salesy content. Write in plain spoken conversational language.`

    let userPrompt = `Create a monthly community content calendar for ${clientName}, a ${trade} serving ${serviceArea}. The month is ${month} ${year}.`
    if (triggers?.trim()) {
      userPrompt += ` Local context this month: ${triggers}.`
    }
    userPrompt += `

Generate exactly 8 posts for the month. For each post include:
1. Week number and suggested day — for example "Week 1 Tuesday"
2. Platform — one of: Nextdoor, Neighborhood Facebook Group, Business Facebook, Business Instagram
3. Post type — one of: Educational Tip, Seasonal Reminder, Neighborhood Proof Story, Community Participation, Storm or Event Response
4. The full post text ready to copy and use
5. A one line note for Todd explaining why this post works and when to adjust it

IMPORTANT: Format each post using this exact structure:
POST [number]
Week: [week and day]
Platform: [platform]
Type: [post type]
---
[full post text]
---
Todd's note: [one line note]

Separate each post clearly. Use this exact format so the output can be parsed.`

    const message = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const rawContent = message.content[0].type === 'text' ? message.content[0].text : ''

    // Parse posts from structured output
    const posts: {
      number: number
      week: string
      platform: string
      type: string
      text: string
      note: string
    }[] = []

    const postBlocks = rawContent.split(/POST\s+\d+/i).filter((b) => b.trim())
    for (let i = 0; i < postBlocks.length; i++) {
      const block = postBlocks[i].trim()
      const weekMatch = block.match(/Week:\s*(.+)/i)
      const platformMatch = block.match(/Platform:\s*(.+)/i)
      const typeMatch = block.match(/Type:\s*(.+)/i)
      const noteMatch = block.match(/Todd['']?s?\s*note:\s*(.+)/i)

      // Extract text between --- delimiters
      const dashSections = block.split(/^---$/m)
      let text = ''
      if (dashSections.length >= 3) {
        text = dashSections[1].trim()
      } else {
        // Fallback: text after Type: line and before Todd's note
        const afterType = block.split(/Type:\s*.+\n/i)[1] || ''
        const beforeNote = afterType.split(/Todd['']?s?\s*note:/i)[0] || afterType
        text = beforeNote.replace(/^---\s*/gm, '').replace(/---\s*$/gm, '').trim()
      }

      posts.push({
        number: i + 1,
        week: weekMatch?.[1]?.trim() || `Week ${i + 1}`,
        platform: platformMatch?.[1]?.trim() || 'Facebook',
        type: typeMatch?.[1]?.trim() || 'Community',
        text,
        note: noteMatch?.[1]?.trim() || '',
      })
    }

    return NextResponse.json({ posts, rawContent })
  } catch (error) {
    console.error('Sage calendar error:', error)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
