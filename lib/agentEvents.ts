import { prisma } from './prisma'
import type { Prisma } from '@prisma/client'

// ─── Event Types ───────────────────────────────────────────────

export type AgentEventType =
  | 'NEW_REVIEW'
  | 'LEAD_CAPTURED'
  | 'INVOICE_OVERDUE'
  | 'REVIEW_RESPONDED'
  | 'LEAD_FOLLOWED_UP'
  | 'PAYMENT_RECEIVED'
  | 'APPOINTMENT_MISSED'

export interface AgentEventPayload {
  type: AgentEventType
  clientId: string
  agentSource: string
  data: Record<string, unknown>
}

// ─── Emit an Agent Event ───────────────────────────────────────

export async function emitAgentEvent(event: AgentEventPayload) {
  // Store the event
  const stored = await prisma.agentEvent.create({
    data: {
      type: event.type,
      clientId: event.clientId,
      agentSource: event.agentSource,
      data: event.data as Prisma.InputJsonValue,
    },
  })

  // Process cross-agent triggers
  await processCrossAgentTriggers(stored.id, event)

  return stored
}

// ─── Cross-Agent Trigger Logic ─────────────────────────────────

async function processCrossAgentTriggers(eventId: string, event: AgentEventPayload) {
  const client = await prisma.agentClient.findUnique({
    where: { id: event.clientId },
  })
  if (!client) return

  switch (event.type) {
    // ── NEW_REVIEW (negative, rating <= 3) ────────────────────
    case 'NEW_REVIEW': {
      const rating = (event.data.rating as number) || 5
      if (rating <= 3) {
        const reviewerName = (event.data.reviewerName as string) || 'Customer'
        const reviewText = (event.data.reviewText as string) || ''

        // Della drafts a review response — queued for Todd's approval
        await prisma.approvalQueueItem.create({
          data: {
            clientId: event.clientId,
            eventId,
            actionType: 'review_response',
            agentSource: 'Rex',
            targetAgent: 'Della',
            title: `Review response for ${reviewerName} (${rating}-star)`,
            content: `Thank you for your feedback, ${reviewerName}. We're sorry to hear about your experience. We take this seriously and would like to make it right. Please reach out to us directly at ${client.contactPhone || 'our office'} so we can address your concerns.`,
            recipientName: reviewerName,
          },
        })

        // Iris checks for matching lead
        if (event.data.customerPhone) {
          const matchingLead = await prisma.irisLead.findFirst({
            where: {
              clientId: event.clientId,
              leadPhone: event.data.customerPhone as string,
            },
          })
          if (matchingLead) {
            await prisma.agentEvent.create({
              data: {
                type: 'LEAD_FOLLOWED_UP',
                clientId: event.clientId,
                agentSource: 'Iris',
                data: { note: `Negative review detected from lead ${matchingLead.leadName}`, leadId: matchingLead.id },
              },
            })
          }
        }

        // Mark original event as handled
        await prisma.agentEvent.update({
          where: { id: eventId },
          data: { handled: true, handledBy: 'Della,Iris', handledAt: new Date() },
        })
      }
      break
    }

    // ── INVOICE_OVERDUE (7+ days) ─────────────────────────────
    case 'INVOICE_OVERDUE': {
      const customerName = (event.data.customerName as string) || 'Customer'
      const amount = (event.data.amount as number) || 0
      const customerEmail = event.data.customerEmail as string

      // Della drafts collections email — queued for approval
      await prisma.approvalQueueItem.create({
        data: {
          clientId: event.clientId,
          eventId,
          actionType: 'collections_email',
          agentSource: 'Max',
          targetAgent: 'Della',
          title: `Payment reminder for ${customerName} — $${amount}`,
          content: `Hi ${customerName},\n\nThis is a friendly reminder that your invoice of $${amount.toFixed(2)} from ${client.businessName} is past due. We'd appreciate your prompt attention to this matter.\n\nPlease contact us at ${client.contactPhone || 'our office'} if you have any questions.\n\nThank you,\n${client.businessName}`,
          recipientName: customerName,
          recipientEmail: customerEmail,
        },
      })

      // Iris pauses nurture sequences for this customer
      if (event.data.customerPhone) {
        const leads = await prisma.irisLead.findMany({
          where: {
            clientId: event.clientId,
            leadPhone: event.data.customerPhone as string,
            status: { in: ['new', 'following-up'] },
          },
        })
        for (const lead of leads) {
          await prisma.irisLead.update({
            where: { id: lead.id },
            data: { status: 'exhausted' },
          })
        }
      }

      await prisma.agentEvent.update({
        where: { id: eventId },
        data: { handled: true, handledBy: 'Della,Iris', handledAt: new Date() },
      })
      break
    }

    // ── LEAD_CAPTURED (new inbound) ──────────────────────────
    case 'LEAD_CAPTURED': {
      const leadName = (event.data.leadName as string) || 'New Lead'
      const serviceNeeded = (event.data.serviceNeeded as string) || 'General Service'

      // Max creates draft invoice template
      await prisma.approvalQueueItem.create({
        data: {
          clientId: event.clientId,
          eventId,
          actionType: 'invoice_template',
          agentSource: 'Iris',
          targetAgent: 'Max',
          title: `Invoice template for ${leadName} — ${serviceNeeded}`,
          content: `Draft invoice for ${leadName}: ${serviceNeeded}. Awaiting job completion details and final amount.`,
          recipientName: leadName,
        },
      })

      // Della drafts 48-hour follow-up email
      await prisma.approvalQueueItem.create({
        data: {
          clientId: event.clientId,
          eventId,
          actionType: 'follow_up_email',
          agentSource: 'Iris',
          targetAgent: 'Della',
          title: `48hr follow-up for ${leadName}`,
          content: `Hi ${leadName},\n\nThank you for reaching out to ${client.businessName} about ${serviceNeeded}. We wanted to follow up and see if you still need help.\n\nWe'd love to get you on our schedule. Give us a call at ${client.contactPhone || 'our office'} — we're happy to help.\n\nBest,\n${client.ownerFirstName}`,
          recipientName: leadName,
          recipientEmail: event.data.leadEmail as string,
        },
      })

      await prisma.agentEvent.update({
        where: { id: eventId },
        data: { handled: true, handledBy: 'Max,Della', handledAt: new Date() },
      })
      break
    }

    // ── APPOINTMENT_MISSED ───────────────────────────────────
    case 'APPOINTMENT_MISSED': {
      const customerName = (event.data.customerName as string) || 'Customer'

      // Iris triggers re-booking sequence
      await prisma.agentEvent.create({
        data: {
          type: 'LEAD_FOLLOWED_UP',
          clientId: event.clientId,
          agentSource: 'Iris',
          data: { note: `Re-booking sequence triggered for missed appointment: ${customerName}` },
        },
      })

      // Della drafts apology + reschedule email
      await prisma.approvalQueueItem.create({
        data: {
          clientId: event.clientId,
          eventId,
          actionType: 'reschedule_email',
          agentSource: 'River',
          targetAgent: 'Della',
          title: `Reschedule email for ${customerName}`,
          content: `Hi ${customerName},\n\nWe're sorry we missed connecting with you today. We'd love to get you rescheduled at a time that works better.\n\nPlease give us a call at ${client.contactPhone || 'our office'} or reply to this email with a few times that work for you.\n\nThank you for your patience,\n${client.businessName}`,
          recipientName: customerName,
          recipientEmail: event.data.customerEmail as string,
        },
      })

      await prisma.agentEvent.update({
        where: { id: eventId },
        data: { handled: true, handledBy: 'Iris,Della', handledAt: new Date() },
      })
      break
    }

    // Other event types — just store, no cross-triggers
    default:
      break
  }
}

// ─── Get recent events for activity feed ───────────────────────

export async function getRecentEvents(options?: {
  clientId?: string
  agentSource?: string
  type?: string
  limit?: number
}) {
  return prisma.agentEvent.findMany({
    where: {
      ...(options?.clientId && { clientId: options.clientId }),
      ...(options?.agentSource && { agentSource: options.agentSource }),
      ...(options?.type && { type: options.type }),
    },
    orderBy: { timestamp: 'desc' },
    take: options?.limit || 50,
  })
}

// ─── Get pending approval items ────────────────────────────────

export async function getPendingApprovals(clientId?: string) {
  return prisma.approvalQueueItem.findMany({
    where: {
      status: 'pending',
      ...(clientId && { clientId }),
    },
    orderBy: { createdAt: 'desc' },
  })
}

// ─── Approve / Reject an item ──────────────────────────────────

export async function handleApproval(
  itemId: string,
  action: 'approve' | 'reject',
  editedContent?: string
) {
  const item = await prisma.approvalQueueItem.findUnique({
    where: { id: itemId },
  })
  if (!item) return null

  if (action === 'reject') {
    return prisma.approvalQueueItem.update({
      where: { id: itemId },
      data: { status: 'rejected', reviewedAt: new Date() },
    })
  }

  // Approve — update content if edited
  const updated = await prisma.approvalQueueItem.update({
    where: { id: itemId },
    data: {
      status: 'approved',
      content: editedContent || item.content,
      reviewedAt: new Date(),
    },
  })

  // TODO: Execute the approved action via the target agent's API
  // For now, mark as approved and let Todd manually execute

  return updated
}
