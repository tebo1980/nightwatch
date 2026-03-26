import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function GET(req: NextRequest) {
  try {
    const clientId = req.nextUrl.searchParams.get('clientId')
    if (!clientId) return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })
    const appointments = await prisma.riverAppointment.findMany({
      where: { clientId },
      include: { reminders: true },
      orderBy: { scheduledAt: 'asc' },
    })
    return NextResponse.json({ appointments })
  } catch (error) {
    console.error('River appointments GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clientId, customerName, customerPhone, customerEmail, serviceType, scheduledAt, durationMinutes, providerName, notes } = body
    if (!clientId || !customerName || !customerPhone || !serviceType || !scheduledAt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const client = await prisma.agentClient.findUnique({ where: { id: clientId } })
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const scheduled = new Date(scheduledAt)
    const appointment = await prisma.riverAppointment.create({
      data: {
        clientId, customerName, customerPhone,
        customerEmail: customerEmail || null,
        serviceType, scheduledAt: scheduled,
        durationMinutes: durationMinutes ? Number(durationMinutes) : 60,
        providerName: providerName || null, notes: notes || null,
      },
    })

    // Create 3 reminder records
    const reminders = []
    const time24h = new Date(scheduled.getTime() - 24 * 60 * 60 * 1000)
    const time2h = new Date(scheduled.getTime() - 2 * 60 * 60 * 1000)
    const time1h = new Date(scheduled.getTime() - 1 * 60 * 60 * 1000)
    const timeStr = scheduled.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

    reminders.push({
      appointmentId: appointment.id, type: 'sms_customer', scheduledFor: time24h, status: 'pending',
      message: `Hi ${customerName}, this is a reminder about your ${serviceType} appointment with ${client.businessName} tomorrow at ${timeStr}. Reply CONFIRM to confirm or call us to reschedule.`,
    })
    reminders.push({
      appointmentId: appointment.id, type: 'sms_customer', scheduledFor: time2h, status: 'pending',
      message: `Hi ${customerName}, just a reminder — your ${serviceType} appointment with ${client.businessName} is in 2 hours at ${timeStr}. See you soon!`,
    })
    if (providerName) {
      reminders.push({
        appointmentId: appointment.id, type: 'sms_provider', scheduledFor: time1h, status: 'pending',
        message: `${providerName}, heads up: ${customerName} has a ${serviceType} appointment in 1 hour at ${timeStr}. Notes: ${notes || 'None'}`,
      })
    }

    await prisma.appointmentReminder.createMany({ data: reminders })

    // Generate and send confirmation SMS via Claude
    try {
      const confirmMsg = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
        system: 'You are River, BaraTrust\'s appointment assistant. Write short, warm, professional appointment confirmation messages for local service businesses. Sound friendly and human.',
        messages: [{ role: 'user', content: `Write a brief SMS confirmation for: ${customerName} just booked a ${serviceType} with ${client.businessName} on ${scheduled.toLocaleDateString()} at ${timeStr}. The provider is ${providerName || 'our team'}. Keep it under 160 characters.` }],
      })
      void (confirmMsg.content[0].type === 'text' ? confirmMsg.content[0].text : '')
      // TODO: Send confirmation via Twilio in production
    } catch (e) {
      console.error('Confirmation generation error:', e)
    }

    return NextResponse.json({ success: true, appointment })
  } catch (error) {
    console.error('River appointments POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json()
    if (!id || !status) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const updateData: Record<string, unknown> = { status }
    const appointment = await prisma.riverAppointment.update({ where: { id }, data: updateData })
    return NextResponse.json({ success: true, appointment })
  } catch (error) {
    console.error('River appointment PATCH error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
