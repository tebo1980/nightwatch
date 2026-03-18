import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { sendLeadEmailNotification, sendLeadSmsNotification } from '@/lib/notifications'

function getAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  })
}

function buildSystemPrompt(client: {
  agentName: string
  businessName: string
  serviceArea: string
  phoneNumber: string
  email: string
  emergencyAvail: boolean
  agentPersonality: string
  jobTypes: string
  pricingRanges: string
  businessHours: string
}): string {
  const jobTypes = JSON.parse(client.jobTypes) as string[]
  const pricingRanges = JSON.parse(client.pricingRanges) as Record<string, string>
  const businessHours = JSON.parse(client.businessHours) as Record<string, string>

  const pricingText = Object.entries(pricingRanges)
    .map(([job, range]) => `- ${job}: ${range}`)
    .join('\n')

  const hoursText = Object.entries(businessHours)
    .map(([day, hours]) => `${day}: ${hours}`)
    .join(', ')

  return `You are ${client.agentName}, a friendly and professional virtual assistant for ${client.businessName}.

ABOUT THIS BUSINESS:
${client.businessName} serves ${client.serviceArea}.
Phone: ${client.phoneNumber}
Email: ${client.email}
Business hours: ${hoursText}
${client.emergencyAvail ? 'Emergency service: Available 24/7' : 'Emergency service: Not available — refer to phone number for urgent situations'}

YOUR PERSONALITY:
${client.agentPersonality}

SERVICES AND TYPICAL PRICING (always say "typically" — never give exact quotes):
${jobTypes.join(', ')}

Pricing guidance:
${pricingText}

YOUR GOAL:
Help customers describe their problem, provide helpful information, give a realistic price range, and collect their contact information so the team can follow up.

CONVERSATION FLOW — follow this order:
1. Acknowledge their situation with empathy first — never sound cheerful about their problem
2. Listen carefully and ask 2-3 clarifying questions about their situation
3. Provide genuinely helpful information
4. Give a realistic price range using the pricing guidance — always say "typically" and note exact quotes require an assessment
5. Ask if they would like someone to reach out to schedule service
6. If yes, collect in this order: first name, phone number, email (tell them it's optional), city or address, best time to call
7. Confirm all details back to them clearly
8. Let them know someone will be in touch and thank them

RULES:
- Keep every response to 2-4 sentences maximum
- Never give exact prices — always give ranges
- If asked if you are AI, say: "I'm a virtual assistant for ${client.businessName} — I'm here to help answer questions and get you connected with our team."
- If the customer has a true emergency (active flooding, gas smell, no heat in dangerous cold), acknowledge urgency first and give the direct number: ${client.phoneNumber}
- Never promise specific availability, pricing, or technicians
- Be empathetic — home problems are stressful and often scary for people. Never say "Great!" or sound excited when they describe a problem. Match their energy — if they seem stressed, be calm and reassuring. If they seem casual, be friendly but professional
- Use the customer's first name once you have it

LEAD CAPTURE — CRITICAL INSTRUCTION:
When you have collected all of the following: first name, phone number, job type, job description, and urgency level — end your final confirmation message with this exact block on a new line. The system will strip it before showing to the customer. Fill in every field accurately:

LEAD_CAPTURED:{"firstName":"","lastName":"","email":"","phone":"","address":"","city":"","jobType":"","jobDescription":"","urgency":"emergency|soon|planning","quoteRangeLow":0,"quoteRangeHigh":0,"bestTimeToCall":"","conversationSummary":"2-3 sentence summary of the customer's problem and what they need"}`
}

interface LeadData {
  firstName: string
  lastName?: string
  email?: string
  phone: string
  address?: string
  city?: string
  jobType: string
  jobDescription: string
  urgency: string
  quoteRangeLow?: number
  quoteRangeHigh?: number
  bestTimeToCall?: string
  conversationSummary: string
}

interface SavedLead {
  id: string
  firstName: string
  lastName: string | null
  email: string | null
  phone: string
  address: string | null
  city: string | null
  jobType: string
  jobDescription: string
  urgency: string
  quoteRangeLow: number | null
  quoteRangeHigh: number | null
  bestTimeToCall: string | null
  conversationSummary: string
}

async function sendToGoHighLevel(
  webhookUrl: string,
  lead: SavedLead,
  client: { businessName: string }
) {
  try {
    const payload = {
      firstName: lead.firstName,
      lastName: lead.lastName || '',
      email: lead.email || '',
      phone: lead.phone,
      address1: lead.address || '',
      city: lead.city || '',
      source: 'BaraTrust Nightwatch',
      tags: ['nightwatch', 'website-lead', lead.jobType, lead.urgency],
      customField: {
        job_type: lead.jobType,
        job_description: lead.jobDescription,
        urgency: lead.urgency,
        quote_range: `$${lead.quoteRangeLow} - $${lead.quoteRangeHigh}`,
        best_time_to_call: lead.bestTimeToCall || 'Anytime',
        conversation_summary: lead.conversationSummary,
        source_business: client.businessName,
      },
    }

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    return true
  } catch (error) {
    console.error('GHL webhook error:', error)
    return false
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId, clientId, message, messages } = body as {
      sessionId: string
      clientId: string
      message: string
      messages: Array<{ role: 'user' | 'assistant'; content: string }>
    }

    if (!sessionId || !clientId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Sanitize input
    const cleanMessage = message.replace(/<[^>]*>/g, '').trim().slice(0, 1000)

    // Load client
    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client || !client.isActive) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Rate limiting — max 30 messages per session per hour
    const existingConversation = await prisma.conversation.findUnique({
      where: { sessionId },
    })

    if (existingConversation) {
      const msgs = JSON.parse(existingConversation.messages) as unknown[]
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      if (
        msgs.length > 30 &&
        new Date(existingConversation.updatedAt) > oneHourAgo
      ) {
        return NextResponse.json({
          message: `You've sent a lot of messages — our team would love to speak with you directly. Please call us at ${client.phoneNumber} or try again later.`,
          leadCaptured: false,
          sessionId,
        })
      }
    }

    // Build messages array for Claude
    const allMessages = [
      ...messages,
      { role: 'user' as const, content: cleanMessage },
    ]


    // Call Claude API with retry
    let response
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await getAnthropicClient().messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          system: buildSystemPrompt(client),
          messages: allMessages,
        })
        break
      } catch (apiErr) {
        if (attempt === 2) throw apiErr
        await new Promise(r => setTimeout(r, 1000))
      }
    }
    if (!response) throw new Error('No response from Claude')

    const rawResponse =
      response.content[0].type === 'text' ? response.content[0].text : ''

    // Check for lead capture
    let leadCaptured = false
    let leadFirstName = ''
    let cleanResponse = rawResponse

    if (rawResponse.includes('LEAD_CAPTURED:')) {
      const parts = rawResponse.split('LEAD_CAPTURED:')
      cleanResponse = parts[0].trim()

      try {
        const leadData: LeadData = JSON.parse(parts[1].trim())
        leadFirstName = leadData.firstName

        // Ensure conversation exists before creating lead
        const conv = await prisma.conversation.upsert({
          where: { sessionId },
          create: {
            clientId: client.id,
            sessionId,
            messages: JSON.stringify([
              ...allMessages,
              { role: 'assistant', content: cleanResponse },
            ]),
            status: 'completed',
            leadCaptured: true,
          },
          update: {
            messages: JSON.stringify([
              ...allMessages,
              { role: 'assistant', content: cleanResponse },
            ]),
            status: 'completed',
            leadCaptured: true,
          },
        })

        // Save lead to database
        const savedLead = await prisma.lead.create({
          data: {
            clientId: client.id,
            conversationId: conv.id,
            firstName: leadData.firstName || '',
            lastName: leadData.lastName || null,
            email: leadData.email || null,
            phone: leadData.phone || '',
            address: leadData.address || null,
            city: leadData.city || null,
            jobType: leadData.jobType || '',
            jobDescription: leadData.jobDescription || '',
            urgency: leadData.urgency || 'soon',
            quoteRangeLow: leadData.quoteRangeLow || null,
            quoteRangeHigh: leadData.quoteRangeHigh || null,
            bestTimeToCall: leadData.bestTimeToCall || null,
            conversationSummary: leadData.conversationSummary || '',
            sentToGHL: false,
          },
        })

        // Fire GHL webhook if configured
        if (client.ghlWebhookUrl) {
          const sent = await sendToGoHighLevel(
            client.ghlWebhookUrl,
            savedLead,
            client
          )
          if (sent) {
            await prisma.lead.update({
              where: { id: savedLead.id },
              data: { sentToGHL: true },
            })
          }
        }

        leadCaptured = true

        // Send email and SMS notifications
        sendLeadEmailNotification(savedLead, client).catch(e => console.error("Email notify error:", e))
        sendLeadSmsNotification(savedLead, client).catch(e => console.error("SMS notify error:", e))
      } catch (parseError) {
        console.error('Lead parse error:', parseError)
      }
    }

    // Save or update conversation (only if lead wasn't captured — that case is handled above)
    if (!leadCaptured) {
      const updatedMessages = JSON.stringify([
        ...allMessages,
        { role: 'assistant', content: cleanResponse },
      ])

      await prisma.conversation.upsert({
        where: { sessionId },
        create: {
          clientId: client.id,
          sessionId,
          messages: updatedMessages,
          status: 'active',
          leadCaptured: false,
        },
        update: {
          messages: updatedMessages,
          status: 'active',
          leadCaptured: false,
        },
      })
    }

    return NextResponse.json({
      message: cleanResponse,
      leadCaptured,
      sessionId,
      leadFirstName: leadFirstName || undefined,
    })
  } catch (error) {
    console.error('Chat route error:', error)
    return NextResponse.json(
      {
        message:
          "I'm having a little trouble right now. Please try again in a moment or call us directly.",
        leadCaptured: false,
        sessionId: '',
      },
      { status: 500 }
    )
  }
}
