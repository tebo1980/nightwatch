import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface LeadNotification {
  firstName: string
  lastName?: string | null
  phone: string
  email?: string | null
  city?: string | null
  jobType: string
  jobDescription: string
  urgency: string
  quoteRangeLow?: number | null
  quoteRangeHigh?: number | null
  bestTimeToCall?: string | null
  conversationSummary: string
}

interface ClientInfo {
  businessName: string
  email: string
  phoneNumber: string
}

export async function sendLeadEmailNotification(
  lead: LeadNotification,
  client: ClientInfo
) {
  try {
    const urgencyLabel =
      lead.urgency === 'emergency' ? 'EMERGENCY' : lead.urgency === 'soon' ? 'Soon' : 'Planning'

    const quoteRange =
      lead.quoteRangeLow && lead.quoteRangeHigh
        ? `$${lead.quoteRangeLow} - $${lead.quoteRangeHigh}`
        : 'Not quoted'

    const customerName = lead.firstName + (lead.lastName ? ' ' + lead.lastName : '')

    await resend.emails.send({
      from: 'Nightwatch <nightwatch@baratrust.com>',
      to: client.email,
      subject: 'New Lead: ' + lead.firstName + ' - ' + lead.jobType + ' (' + urgencyLabel + ')',
      html: '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">'
        + '<div style="background:#0E0C0A;padding:20px 24px;border-radius:12px 12px 0 0;">'
        + '<h1 style="color:#C17B2A;font-size:18px;margin:0;">New Lead from Nightwatch</h1>'
        + '<p style="color:#8A8070;font-size:13px;margin:4px 0 0;">' + client.businessName + '</p>'
        + '</div>'
        + '<div style="background:#1E1B16;padding:24px;border-radius:0 0 12px 12px;">'
        + '<h2 style="color:#F2EDE4;font-size:16px;margin:0 0 16px;">Customer Information</h2>'
        + '<table style="width:100%;color:#F2EDE4;font-size:14px;">'
        + '<tr><td style="padding:6px 0;color:#8A8070;">Name</td><td>' + customerName + '</td></tr>'
        + '<tr><td style="padding:6px 0;color:#8A8070;">Phone</td><td><a href="tel:' + lead.phone + '" style="color:#C17B2A;">' + lead.phone + '</a></td></tr>'
        + (lead.email ? '<tr><td style="padding:6px 0;color:#8A8070;">Email</td><td>' + lead.email + '</td></tr>' : '')
        + (lead.city ? '<tr><td style="padding:6px 0;color:#8A8070;">City</td><td>' + lead.city + '</td></tr>' : '')
        + '<tr><td style="padding:6px 0;color:#8A8070;">Best Time</td><td>' + (lead.bestTimeToCall || 'Anytime') + '</td></tr>'
        + '</table>'
        + '<hr style="border:none;border-top:1px solid rgba(193,123,42,0.15);margin:16px 0;">'
        + '<h2 style="color:#F2EDE4;font-size:16px;margin:0 0 12px;">Job Details</h2>'
        + '<table style="width:100%;color:#F2EDE4;font-size:14px;">'
        + '<tr><td style="padding:6px 0;color:#8A8070;">Service</td><td>' + lead.jobType + '</td></tr>'
        + '<tr><td style="padding:6px 0;color:#8A8070;">Urgency</td><td>' + urgencyLabel + '</td></tr>'
        + '<tr><td style="padding:6px 0;color:#8A8070;">Quote Range</td><td>' + quoteRange + '</td></tr>'
        + '</table>'
        + '<hr style="border:none;border-top:1px solid rgba(193,123,42,0.15);margin:16px 0;">'
        + '<h2 style="color:#F2EDE4;font-size:16px;margin:0 0 8px;">Summary</h2>'
        + '<p style="color:#F2EDE4;font-size:14px;line-height:1.5;">' + lead.conversationSummary + '</p>'
        + '<hr style="border:none;border-top:1px solid rgba(193,123,42,0.15);margin:16px 0;">'
        + '<p style="color:#8A8070;font-size:11px;">Captured by Nightwatch AI Sales Agent</p>'
        + '</div></div>',
    })
    return true
  } catch (error) {
    console.error('Email notification error:', error)
    return false
  }
}

export async function sendLeadSmsNotification(
  lead: LeadNotification,
  client: ClientInfo
) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !twilioPhone) {
    console.log('Twilio not configured, skipping SMS')
    return false
  }

  try {
    const twilio = require('twilio')(accountSid, authToken)
    const urgencyLabel =
      lead.urgency === 'emergency' ? 'EMERGENCY' : lead.urgency === 'soon' ? 'Soon' : 'Planning'
    const quoteRange =
      lead.quoteRangeLow && lead.quoteRangeHigh
        ? ' $' + lead.quoteRangeLow + '-$' + lead.quoteRangeHigh
        : ''

    const body = 'New Nightwatch Lead for ' + client.businessName + ':\n'
      + lead.firstName + ' - ' + lead.phone + '\n'
      + lead.jobType + ' (' + urgencyLabel + ')' + quoteRange + '\n'
      + lead.conversationSummary.slice(0, 120)

    await twilio.messages.create({
      body: body,
      from: twilioPhone,
      to: client.phoneNumber,
    })
    return true
  } catch (error) {
    console.error('SMS notification error:', error)
    return false
  }
}
