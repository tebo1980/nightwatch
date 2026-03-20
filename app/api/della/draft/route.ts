import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDellaSystemPrompt, getDellaSubjectPrompt } from '@/lib/della-prompts'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clientId, emailType, recipientName, recipientEmail, requestNotes } = body

    if (!clientId || !emailType || !recipientName || !requestNotes) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const client = await prisma.agentClient.findUnique({ where: { id: clientId } })
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const systemPrompt = getDellaSystemPrompt(client)
    const subjectSystemPrompt = getDellaSubjectPrompt(client)

    const userMsg = `Write a "${emailType}" email to ${recipientName}${recipientEmail ? ` (${recipientEmail})` : ''}.

Here's what ${client.ownerFirstName} needs to communicate:
${requestNotes}

Write the email body only.`

    const subjectMsg = `Write a subject line for a "${emailType}" email to ${recipientName}. Context: ${requestNotes.substring(0, 150)}`

    const [bodyRes, subjectRes] = await Promise.all([
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMsg }],
      }),
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 60,
        system: subjectSystemPrompt,
        messages: [{ role: 'user', content: subjectMsg }],
      }),
    ])

    const emailBody = bodyRes.content[0].type === 'text' ? bodyRes.content[0].text : ''
    const subject = subjectRes.content[0].type === 'text'
      ? subjectRes.content[0].text.trim()
      : `${emailType} — ${client.businessName}`

    const draft = await prisma.dellaDraft.create({
      data: {
        clientId,
        emailType,
        recipientName,
        recipientEmail: recipientEmail || null,
        subject,
        body: emailBody,
        requestNotes,
        status: 'draft',
      },
    })

    return NextResponse.json({ success: true, draft })
  } catch (error) {
    console.error('Della draft error:', error)
    return NextResponse.json({ error: 'Draft failed' }, { status: 500 })
  }
}
