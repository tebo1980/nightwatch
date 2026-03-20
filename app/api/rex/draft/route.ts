import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRexSystemPrompt } from '@/lib/rex-prompts'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { reviewId, notes } = body

    if (!reviewId) {
      return NextResponse.json({ error: 'Missing reviewId' }, { status: 400 })
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { client: true },
    })

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    const systemPrompt = getRexSystemPrompt(review.client)
    let userMessage = `Draft a response to this ${review.rating}-star review from ${review.reviewerName} on ${review.platform}:\n\n"${review.reviewText}"\n\nWrite only the response.`

    if (notes) {
      userMessage += `\n\nAdditional instructions: ${notes}`
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const draft = message.content[0].type === 'text' ? message.content[0].text : ''

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: { draftResponse: draft, status: 'drafted' },
    })

    return NextResponse.json({ success: true, review: updated })
  } catch (error) {
    console.error('Rex draft error:', error)
    return NextResponse.json({ error: 'Failed to generate draft' }, { status: 500 })
  }
}
