import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRexWeeklySummaryPrompt } from '@/lib/rex-prompts'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'

const anthropic = new Anthropic()
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clientId } = body

    if (!clientId) {
      return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })
    }

    const client = await prisma.agentClient.findUnique({ where: { id: clientId } })
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - 7)

    const reviews = await prisma.review.findMany({
      where: {
        clientId,
        reviewDate: { gte: weekStart },
      },
      orderBy: { reviewDate: 'desc' },
    })

    const totalReviews = reviews.length
    const avgRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0
    const fiveStarCount = reviews.filter((r) => r.rating === 5).length
    const oneStarCount = reviews.filter((r) => r.rating <= 2).length

    // Generate summary with Claude
    const systemPrompt = getRexWeeklySummaryPrompt(client)
    const reviewDetails = reviews.length > 0
      ? reviews.map((r) => `- ${r.rating}★ from ${r.reviewerName} (${r.platform}): "${r.reviewText}"`).join('\n')
      : 'No new reviews this week.'

    const userMessage = `Here are the stats for ${client.businessName} this week (${weekStart.toLocaleDateString()} - ${now.toLocaleDateString()}):\n\nTotal reviews: ${totalReviews}\nAverage rating: ${avgRating.toFixed(1)}\n5-star reviews: ${fiveStarCount}\n1-2 star reviews: ${oneStarCount}\n\nReviews:\n${reviewDetails}\n\nWrite the weekly summary.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const summaryText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Save report
    const report = await prisma.weeklyRepReport.create({
      data: {
        clientId,
        weekStart,
        weekEnd: now,
        totalReviews,
        avgRating: Math.round(avgRating * 10) / 10,
        fiveStarCount,
        oneStarCount,
        summaryText,
      },
    })

    // Send email to client
    try {
      const stars = (n: number) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n))
      await resend.emails.send({
        from: 'Rex at BaraTrust <rex@baratrust.com>',
        to: client.ownerEmail,
        subject: `Weekly Reputation Report — ${client.businessName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #0E0C0A; padding: 32px; border-radius: 12px;">
              <p style="color: #C17B2A; font-size: 12px; letter-spacing: 2px; margin: 0 0 4px;">REX — WEEKLY REPUTATION REPORT</p>
              <h1 style="color: #F2EDE4; font-size: 22px; margin: 0 0 4px;">${client.businessName}</h1>
              <p style="color: #8A8070; font-size: 13px; margin: 0 0 24px;">${weekStart.toLocaleDateString()} — ${now.toLocaleDateString()}</p>

              <div style="display: flex; gap: 12px; margin-bottom: 24px;">
                <div style="flex: 1; background: #1E1B16; padding: 16px; border-radius: 8px; text-align: center;">
                  <div style="color: #C17B2A; font-size: 28px; font-weight: bold;">${totalReviews}</div>
                  <div style="color: #8A8070; font-size: 11px;">Reviews</div>
                </div>
                <div style="flex: 1; background: #1E1B16; padding: 16px; border-radius: 8px; text-align: center;">
                  <div style="color: #C17B2A; font-size: 28px; font-weight: bold;">${avgRating.toFixed(1)}</div>
                  <div style="color: #8A8070; font-size: 11px;">${stars(avgRating)}</div>
                </div>
                <div style="flex: 1; background: #1E1B16; padding: 16px; border-radius: 8px; text-align: center;">
                  <div style="color: #C17B2A; font-size: 28px; font-weight: bold;">${fiveStarCount}</div>
                  <div style="color: #8A8070; font-size: 11px;">5-Star</div>
                </div>
              </div>

              <div style="background: #1E1B16; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                <p style="color: #F2EDE4; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-line;">${summaryText}</p>
              </div>

              <p style="color: #8A8070; font-size: 11px; text-align: center; margin: 0;">— Rex, BaraTrust AI Staff</p>
            </div>
          </div>
        `,
      })

      await prisma.weeklyRepReport.update({
        where: { id: report.id },
        data: { sentAt: new Date() },
      })
    } catch (emailErr) {
      console.error('Weekly report email error:', emailErr)
    }

    return NextResponse.json({ success: true, report })
  } catch (error) {
    console.error('Rex weekly report error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
