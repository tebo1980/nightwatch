import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMaxReviewRequestPrompt, getMaxPaymentReminderPrompt } from '@/lib/max-prompts'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'

const anthropic = new Anthropic()
const resend = new Resend(process.env.RESEND_API_KEY)

async function handleProcess() {
  try {
    const now = new Date()
    const results = { reviewRequests: 0, paymentReminders: 0 }

    const clients = await prisma.agentClient.findMany({
      where: { active: true, maxEnabled: true },
    })

    for (const client of clients) {
      // === REVIEW REQUESTS ===
      const reviewCutoff = new Date()
      reviewCutoff.setDate(reviewCutoff.getDate() - client.maxReviewDelayDays)

      const jobsReadyForReview = await prisma.maxJob.findMany({
        where: {
          clientId: client.id,
          completedAt: { lte: reviewCutoff },
          reviewRequested: false,
          customerEmail: { not: null },
        },
      })

      for (const job of jobsReadyForReview) {
        try {
          const systemPrompt = getMaxReviewRequestPrompt(client)
          const userMsg = `Write a review request email for ${job.customerName} who just had "${job.serviceProvided}" completed.${job.notes ? ` Notes: ${job.notes}` : ''}`

          const msgRes = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 200,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMsg }],
          })

          const message = msgRes.content[0].type === 'text' ? msgRes.content[0].text : ''

          await resend.emails.send({
            from: `${client.ownerFirstName} at ${client.businessName} <max@baratrust.com>`,
            to: job.customerEmail!,
            subject: `How did we do, ${job.customerName.split(' ')[0]}?`,
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
              <p style="white-space: pre-wrap; line-height: 1.7;">${message}</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;"/>
              <p style="color: #999; font-size: 12px;">${client.businessName} · ${client.city}, ${client.state}</p>
            </div>`,
          })

          await prisma.maxJob.update({
            where: { id: job.id },
            data: { reviewRequested: true, reviewRequestedAt: now },
          })

          results.reviewRequests++
        } catch (e) {
          console.error('Review request error:', e)
        }
      }

      // === PAYMENT REMINDERS ===
      const reminderDays = client.maxPaymentReminderDays.split(',').map(Number)

      const overdueInvoices = await prisma.maxInvoice.findMany({
        where: {
          clientId: client.id,
          status: 'unpaid',
          dueDate: { lt: now },
          remindersCount: { lt: reminderDays.length },
          customerEmail: { not: null },
        },
      })

      for (const invoice of overdueInvoices) {
        const daysPastDue = Math.floor((now.getTime() - invoice.dueDate.getTime()) / 86400000)
        const nextReminderDay = reminderDays[invoice.remindersCount]

        if (daysPastDue < nextReminderDay) continue

        try {
          const reminderNum = invoice.remindersCount + 1
          const systemPrompt = getMaxPaymentReminderPrompt(client, reminderNum)
          const userMsg = `Write payment reminder #${reminderNum} for ${invoice.customerName}.
Invoice #${invoice.invoiceNumber || 'N/A'} for $${invoice.amount.toFixed(2)}.
Original due date: ${invoice.dueDate.toLocaleDateString()}.
Days past due: ${daysPastDue}.
${invoice.description ? `For: ${invoice.description}` : ''}`

          const msgRes = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 250,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMsg }],
          })

          const message = msgRes.content[0].type === 'text' ? msgRes.content[0].text : ''

          const subject = reminderNum === 1
            ? `Quick reminder — invoice from ${client.businessName}`
            : reminderNum === 2
              ? `Invoice overdue — ${client.businessName}`
              : `Final notice — invoice #${invoice.invoiceNumber || ''} from ${client.businessName}`

          await resend.emails.send({
            from: `${client.ownerFirstName} at ${client.businessName} <max@baratrust.com>`,
            to: invoice.customerEmail!,
            subject,
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
              <p style="white-space: pre-wrap; line-height: 1.7;">${message}</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;"/>
              <p style="color: #999; font-size: 12px;">${client.businessName} · ${client.city}, ${client.state}</p>
            </div>`,
          })

          await prisma.maxReminder.create({
            data: { invoiceId: invoice.id, reminderNum, message, sentAt: now, status: 'sent' },
          })

          await prisma.maxInvoice.update({
            where: { id: invoice.id },
            data: { remindersCount: reminderNum, lastReminderAt: now },
          })

          results.paymentReminders++
        } catch (e) {
          console.error('Payment reminder error:', e)
        }
      }
    }

    return NextResponse.json({ success: true, ...results })
  } catch (error) {
    console.error('Max process error:', error)
    return NextResponse.json({ error: 'Process failed' }, { status: 500 })
  }
}

// GET for Vercel cron
export async function GET() {
  return handleProcess()
}

// POST for manual trigger
export async function POST() {
  return handleProcess()
}
