import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const client = await prisma.client.findUnique({ where: { id } })
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    return NextResponse.json({ client })
  } catch (error) {
    console.error('GET /api/clients/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const client = await prisma.client.update({
      where: { id },
      data: {
        businessName: body.businessName,
        agentName: body.agentName,
        agentPersonality: body.agentPersonality,
        serviceArea: body.serviceArea,
        jobTypes: body.jobTypes,
        pricingRanges: body.pricingRanges,
        emergencyAvail: body.emergencyAvail,
        businessHours: body.businessHours,
        phoneNumber: body.phoneNumber,
        email: body.email,
        website: body.website || null,
        ghlWebhookUrl: body.ghlWebhookUrl || null,
        ghlApiKey: body.ghlApiKey || null,
        widgetColor: body.widgetColor,
        greeting: body.greeting,
        isActive: body.isActive,
      },
    })

    return NextResponse.json({ client })
  } catch (error) {
    console.error('PUT /api/clients/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
  }
}
