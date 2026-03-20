import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// TODO: In production, add Vercel cron endpoint at /api/river/process
// to automatically send all due reminders every 15 minutes

export async function POST(req: NextRequest) {
  try {
    const { reminderId, sendAll, clientId } = await req.json()

    // Send all due reminders for a client
    if (sendAll && clientId) {
      const now = new Date()
      const dueReminders = await prisma.appointmentReminder.findMany({
        where: { status: 'pending', scheduledFor: { lte: now }, appointment: { clientId } },
        include: { appointment: { include: { client: true } } },
      })

      let sent = 0
      for (const reminder of dueReminders) {
        try {
          const appt = reminder.appointment
          if (reminder.type === 'sms_customer' || reminder.type === 'sms_provider') {
            const to = reminder.type === 'sms_customer' ? appt.customerPhone : appt.client.contactPhone
            if (to && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
              const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
              await twilio.messages.create({ body: reminder.message, from: process.env.TWILIO_PHONE_NUMBER, to })
            }
          } else if (reminder.type === 'email_customer' && appt.customerEmail) {
            const { Resend } = require('resend')
            const resend = new Resend(process.env.RESEND_API_KEY)
            await resend.emails.send({
              from: `${appt.client.businessName} <river@baratrust.com>`,
              to: appt.customerEmail,
              subject: `Appointment Reminder — ${appt.client.businessName}`,
              html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333;line-height:1.7;"><p>${reminder.message}</p><p style="color:#999;font-size:12px;">Questions? Reply to this email.</p></div>`,
            })
          }

          await prisma.appointmentReminder.update({
            where: { id: reminder.id },
            data: { status: 'sent', sentAt: new Date() },
          })
          sent++
        } catch (e) {
          console.error('Reminder send error:', e)
          await prisma.appointmentReminder.update({ where: { id: reminder.id }, data: { status: 'failed' } })
        }
      }
      return NextResponse.json({ success: true, sent, total: dueReminders.length })
    }

    // Send single reminder
    if (!reminderId) return NextResponse.json({ error: 'Missing reminderId' }, { status: 400 })

    const reminder = await prisma.appointmentReminder.findUnique({
      where: { id: reminderId },
      include: { appointment: { include: { client: true } } },
    })
    if (!reminder) return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })

    const appt = reminder.appointment
    if (reminder.type === 'sms_customer' || reminder.type === 'sms_provider') {
      const to = reminder.type === 'sms_customer' ? appt.customerPhone : appt.client.contactPhone
      if (to && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
        await twilio.messages.create({ body: reminder.message, from: process.env.TWILIO_PHONE_NUMBER, to })
      }
    }

    await prisma.appointmentReminder.update({
      where: { id: reminderId },
      data: { status: 'sent', sentAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('River send error:', error)
    return NextResponse.json({ error: 'Send failed' }, { status: 500 })
  }
}
