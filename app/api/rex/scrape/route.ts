import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scrapeGoogleReviews, scrapeYelpReviews } from '@/lib/rex-scraper'
import { getRexSystemPrompt } from '@/lib/rex-prompts'
import { recordInsight } from '@/lib/memoria'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'

const anthropic = new Anthropic()
const resend = new Resend(process.env.RESEND_API_KEY)

async function handleScrape() {
  try {
    const clients = await prisma.agentClient.findMany({
      where: { active: true, rexEnabled: true },
    })

    const results = []

    for (const client of clients) {
      const googleNew = await scrapeGoogleReviews(client)
      const yelpNew = await scrapeYelpReviews(client)
      const totalNew = googleNew + yelpNew

      if (totalNew > 0) {
        const pendingReviews = await prisma.review.findMany({
          where: { clientId: client.id, status: 'pending' },
        })

        for (const review of pendingReviews) {
          try {
            const systemPrompt = getRexSystemPrompt(client)
            const userMessage = `Draft a response to this ${review.rating}-star review from ${review.reviewerName} on ${review.platform}:\n\n"${review.reviewText}"\n\nWrite only the response.`

            const message = await anthropic.messages.create({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 300,
              system: systemPrompt,
              messages: [{ role: 'user', content: userMessage }],
            })

            const draft = message.content[0].type === 'text' ? message.content[0].text : ''

            await prisma.review.update({
              where: { id: review.id },
              data: { draftResponse: draft, status: 'drafted' },
            })
          } catch (e) {
            console.error('Draft error:', e)
          }
        }

        try {
          await resend.emails.send({
            from: 'Rex at BaraTrust <rex@baratrust.com>',
            to: process.env.TODD_EMAIL || 'todd@baratrust.com',
            subject: `Rex Alert: ${totalNew} new review${totalNew > 1 ? 's' : ''} for ${client.businessName}`,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 24px; background: #0E0C0A; color: #F2EDE4; max-width: 600px; border-radius: 8px;">
                <p style="color: #C17B2A; font-size: 13px; margin: 0 0 8px;">REX — REVIEW ALERT</p>
                <h2 style="color: #F2EDE4; margin: 0 0 16px;">${totalNew} new review${totalNew > 1 ? 's' : ''} for ${client.businessName}</h2>
                <p style="color: #F2EDE4;">${googleNew > 0 ? `${googleNew} from Google. ` : ''}${yelpNew > 0 ? `${yelpNew} from Yelp.` : ''}</p>
                <p style="color: #F2EDE4;">Drafts are ready for review.</p>
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || ''}/rex" style="display: inline-block; background: #C17B2A; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">View in Rex Dashboard</a>
              </div>
            `,
          })
        } catch (emailErr) {
          console.error('Email alert error:', emailErr)
        }

        // ─── Memoria: Rex reputation insights ───────────────────────
        try {
          // Check for negative review trends
          const negativeReviews = pendingReviews.filter((r) => r.rating <= 2)
          if (negativeReviews.length > 0) {
            // Find most common complaint theme from negative review text
            const complaints = negativeReviews.map((r) => r.reviewText).join(' ')
            const themes = ['communication', 'pricing', 'quality', 'timeliness', 'professionalism', 'cleanliness']
            const themeCounts = themes.map((t) => ({ theme: t, count: (complaints.toLowerCase().match(new RegExp(t, 'g')) || []).length }))
            const topTheme = themeCounts.sort((a, b) => b.count - a.count)[0]
            const theme = topTheme.count > 0 ? topTheme.theme : 'general dissatisfaction'

            await recordInsight({
              clientId: client.id,
              category: 'reputation',
              insight: `Negative review count increased by ${negativeReviews.length} this period. Most common complaint theme: ${theme}.`,
              confidence: 'medium',
              source: 'Rex',
              tradeVertical: client.industry,
            })
          }

          // Check response rate
          const allReviews = await prisma.review.findMany({
            where: { clientId: client.id },
          })
          const respondedReviews = allReviews.filter((r) => r.finalResponse || r.status === 'posted')
          const responseRate = allReviews.length > 0 ? respondedReviews.length / allReviews.length : 1

          if (responseRate < 0.5 && allReviews.length >= 4) {
            await recordInsight({
              clientId: client.id,
              category: 'reputation',
              insight: 'Owner response rate to Google reviews is below 50%. Businesses that respond to all reviews average 0.4 higher star ratings over 6 months.',
              confidence: 'high',
              source: 'Rex',
              tradeVertical: client.industry,
            })
          }
        } catch (memoriaErr) {
          console.error('Rex Memoria insight error:', memoriaErr)
        }

        results.push({ clientId: client.id, businessName: client.businessName, newReviews: totalNew })
      }
    }

    return NextResponse.json({ success: true, processed: results })
  } catch (error) {
    console.error('Rex scrape error:', error)
    return NextResponse.json({ error: 'Scrape failed' }, { status: 500 })
  }
}

// GET for Vercel cron
export async function GET() {
  return handleScrape()
}

// POST for manual trigger
export async function POST() {
  return handleScrape()
}
