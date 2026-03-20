import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const client = await prisma.agentClient.create({
      data: {
        businessName: body.businessName,
        industry: body.industry,
        ownerName: body.ownerName,
        ownerFirstName: body.ownerFirstName,
        ownerEmail: body.ownerEmail,
        contactPhone: body.contactPhone || null,
        website: body.website || null,
        city: body.city,
        state: body.state,
        zipCode: body.zipCode || null,
        businessAddress: body.businessAddress || null,
        tonePreference: body.tonePreference || 'friendly',
        tagline: body.tagline || null,
        servicesOffered: body.servicesOffered,
        typicalJobTypes: body.typicalJobTypes || null,
        avgTicketSize: body.avgTicketSize || null,
        idealCustomer: body.idealCustomer || null,
        googleReviewLink: body.googleReviewLink || null,
        googlePlaceId: body.googlePlaceId || null,
        yelpBusinessId: body.yelpBusinessId || null,
        irisFollowUpDay1: body.irisFollowUpDay1 || 1,
        irisFollowUpDay2: body.irisFollowUpDay2 || 3,
        irisFollowUpDay3: body.irisFollowUpDay3 || 7,
        maxReviewDelayDays: body.maxReviewDelayDays || 2,
        maxPaymentReminderDays: body.maxPaymentReminderDays || '7,14,30',
        riverBusinessHours: body.riverBusinessHours || null,
        riverAppointmentTypes: body.riverAppointmentTypes || null,
        tier: body.tier || 'complete',
        novaEnabled: body.novaEnabled || false,
        rexEnabled: body.rexEnabled || false,
        irisEnabled: body.irisEnabled || false,
        maxEnabled: body.maxEnabled || false,
        dellaEnabled: body.dellaEnabled || false,
        flynnEnabled: body.flynnEnabled || false,
        coleEnabled: body.coleEnabled || false,
        riverEnabled: body.riverEnabled || false,
        sageEnabled: body.sageEnabled || false,
        atlasEnabled: body.atlasEnabled || false,
        notes: body.notes || null,
      },
    })

    return NextResponse.json({ success: true, client })
  } catch (error) {
    console.error('Create client error:', error)
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
  }
}
