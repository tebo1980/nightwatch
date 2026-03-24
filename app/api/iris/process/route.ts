import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getIrisSystemPrompt, getIrisSubjectLine } from '@/lib/iris-prompts'
import { recordInsight } from '@/lib/memoria'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'

const anthropic = new Anthropic()
const resend = new Resend(process.env.RESEND_API_KEY)

async function handleProcess() {
  try {
    const now = new Date()

    const dueLeads = await prisma.irisLead.findMany({
      where: {
        nextFollowUpAt: { lte: now },
        status: { in: ['new', 'following-up'] },
        followUpCount: { lt: 3 },
        client: { irisEnabled: true, active: true },
      },
      include: { client: true },
    })

    const results = []

    for (const lead of dueLeads) {
      const client = lead.client
      const followUpNum = lead.followUpCount + 1

      const systemPrompt = getIrisSystemPrompt(client)
      const daysSinceContact = Math.floor((now.getTime() - lead.createdAt.getTime()) / 86400000)

      const userMsg = `Write follow-up #${followUpNum} for this lead:
Name: ${lead.leadName}
Service interested in: ${lead.serviceNeeded || 'general inquiry'}
Their initial message: "${lead.initialMessage || 'They reached out through the website'}"
Days since first contact: ${daysSinceContact}

Write the message body only.`

      const [bodyRes, subjectRes] = await Promise.all([
        anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 250,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMsg }],
        }),
        lead.leadEmail
          ? anthropic.messages.create({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 50,
              system: getIrisSubjectLine(client),
              messages: [{ role: 'user', content: `Follow-up #${followUpNum} to ${lead.leadName} about ${lead.serviceNeeded || 'their inquiry'}.` }],
            })
          : Promise.resolve(null),
      ])

      const message = bodyRes.content[0].type === 'text' ? bodyRes.content[0].text : ''
      const subject = subjectRes?.content[0]?.type === 'text'
        ? subjectRes.content[0].text.trim()
        : `Following up — ${client.businessName}`

      // Send email if available
      if (lead.leadEmail) {
        try {
          await resend.emails.send({
            from: `${client.ownerFirstName} at ${client.businessName} <iris@baratrust.com>`,
            to: lead.leadEmail,
            subject,
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
              <p style="white-space: pre-wrap; line-height: 1.7;">${message}</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;"/>
              <p style="color: #999; font-size: 12px;">${client.businessName} · ${client.city}, ${client.state}</p>
            </div>`,
          })
        } catch (emailErr) {
          console.error('Iris email error:', emailErr)
        }
      }

      // Save follow-up record
      await prisma.irisFollowUp.create({
        data: {
          leadId: lead.id,
          followUpNum,
          channel: lead.leadEmail ? 'email' : 'sms-note',
          subject: lead.leadEmail ? subject : null,
          message,
          sentAt: new Date(),
          status: 'sent',
        },
      })

      // Calculate next follow-up
      let nextFollowUp: Date | null = null
      if (followUpNum === 1) {
        nextFollowUp = new Date()
        nextFollowUp.setDate(nextFollowUp.getDate() + (client.irisFollowUpDay2 - client.irisFollowUpDay1))
      } else if (followUpNum === 2) {
        nextFollowUp = new Date()
        nextFollowUp.setDate(nextFollowUp.getDate() + (client.irisFollowUpDay3 - client.irisFollowUpDay2))
      }

      await prisma.irisLead.update({
        where: { id: lead.id },
        data: {
          followUpCount: followUpNum,
          lastFollowUpAt: new Date(),
          nextFollowUpAt: nextFollowUp,
          status: followUpNum >= 3 ? 'exhausted' : 'following-up',
        },
      })

      results.push({ leadId: lead.id, leadName: lead.leadName, followUpNum })
    }

    // ─── Memoria: Iris lead conversion insights ───────────────────
    // Run once per process cycle, analyzing patterns across all clients
    try {
      const clientIds = [...new Set(dueLeads.map((l) => l.clientId))]
      for (const cid of clientIds) {
        const clientObj = dueLeads.find((l) => l.clientId === cid)?.client
        if (!clientObj) continue

        // Lead source conversion tracking
        const allLeads = await prisma.irisLead.findMany({ where: { clientId: cid } })
        const sourceGroups: Record<string, { total: number; converted: number }> = {}
        for (const l of allLeads) {
          const src = l.source || 'unknown'
          if (!sourceGroups[src]) sourceGroups[src] = { total: 0, converted: 0 }
          sourceGroups[src].total++
          if (l.status === 'converted') sourceGroups[src].converted++
        }

        for (const [source, stats] of Object.entries(sourceGroups)) {
          if (stats.total >= 5) {
            const rate = ((stats.converted / stats.total) * 100).toFixed(0)
            await recordInsight({
              clientId: cid,
              category: 'customer',
              insight: `Lead source "${source}" has ${stats.total} leads with a ${rate}% conversion rate. ${Number(rate) > 30 ? 'This is a strong channel worth investing in.' : 'Consider improving follow-up speed or messaging for this channel.'}`,
              confidence: stats.total >= 10 ? 'high' : 'medium',
              source: 'Iris',
              tradeVertical: clientObj.industry,
            })
          }
        }

        // Time-to-response correlation
        const convertedLeads = allLeads.filter((l) => l.status === 'converted' && l.convertedAt)
        const quickResponders = convertedLeads.filter((l) => {
          const firstFollowUpTime = l.lastFollowUpAt ? l.lastFollowUpAt.getTime() - l.createdAt.getTime() : Infinity
          return firstFollowUpTime <= 3600000 // 1 hour
        })

        if (convertedLeads.length >= 5 && quickResponders.length > 0) {
          const quickRate = ((quickResponders.length / Math.max(1, allLeads.filter((l) => {
            const ft = l.lastFollowUpAt ? l.lastFollowUpAt.getTime() - l.createdAt.getTime() : Infinity
            return ft <= 3600000
          }).length)) * 100).toFixed(0)

          if (Number(quickRate) > 40) {
            await recordInsight({
              clientId: cid,
              category: 'behavioral',
              insight: `Leads responded to within 1 hour convert at ${quickRate}% — significantly higher than slower responses. Speed of first contact is the strongest predictor of conversion for this business.`,
              confidence: 'high',
              source: 'Iris',
              tradeVertical: clientObj.industry,
            })
          }
        }
      }
    } catch (memoriaErr) {
      console.error('Iris Memoria insight error:', memoriaErr)
    }

    return NextResponse.json({ success: true, processed: results.length, results })
  } catch (error) {
    console.error('Iris process error:', error)
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
