import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { draftId, finalSubject, finalBody, recipientEmail } = await req.json()

    const draft = await prisma.dellaDraft.findUnique({
      where: { id: draftId },
      include: { client: true },
    })
    if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })

    const toEmail = recipientEmail || draft.recipientEmail
    if (!toEmail) return NextResponse.json({ error: 'Recipient email required' }, { status: 400 })

    const sendBody = finalBody || draft.body
    const sendSubject = finalSubject || draft.subject

    await resend.emails.send({
      from: `${draft.client.ownerFirstName} at ${draft.client.businessName} <della@baratrust.com>`,
      to: toEmail,
      subject: sendSubject,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333; line-height: 1.7;"><p style="white-space: pre-wrap;">${sendBody}</p></div>`,
    })

    const updated = await prisma.dellaDraft.update({
      where: { id: draftId },
      data: {
        body: sendBody,
        subject: sendSubject,
        recipientEmail: toEmail,
        status: 'sent',
        sentAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, draft: updated })
  } catch (error) {
    console.error('Della send error:', error)
    return NextResponse.json({ error: 'Send failed' }, { status: 500 })
  }
}
