import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { conversations: true, leads: true },
        },
      },
    })

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const clientsWithStats = await Promise.all(
      clients.map(async (client) => {
        const [leadsThisMonth, convsThisMonth, ghlSentThisMonth, lastConv] =
          await Promise.all([
            prisma.lead.count({
              where: { clientId: client.id, createdAt: { gte: startOfMonth } },
            }),
            prisma.conversation.count({
              where: { clientId: client.id, createdAt: { gte: startOfMonth } },
            }),
            prisma.lead.count({
              where: {
                clientId: client.id,
                sentToGHL: true,
                createdAt: { gte: startOfMonth },
              },
            }),
            prisma.conversation.findFirst({
              where: { clientId: client.id },
              orderBy: { updatedAt: 'desc' },
              select: { updatedAt: true },
            }),
          ])

        return {
          ...client,
          leadsThisMonth,
          convsThisMonth,
          ghlSentThisMonth,
          lastActivity: lastConv?.updatedAt || null,
        }
      })
    )

    return NextResponse.json({ clients: clientsWithStats })
  } catch (error) {
    console.error('GET /api/clients error:', error)
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const client = await prisma.client.create({
      data: {
        businessName: body.businessName,
        agentName: body.agentName,
        agentPersonality: body.agentPersonality,
        serviceArea: body.serviceArea,
        jobTypes: body.jobTypes,
        pricingRanges: body.pricingRanges,
        emergencyAvail: body.emergencyAvail || false,
        businessHours: body.businessHours,
        phoneNumber: body.phoneNumber,
        email: body.email,
        website: body.website || null,
        ghlWebhookUrl: body.ghlWebhookUrl || null,
        ghlApiKey: body.ghlApiKey || null,
        widgetColor: body.widgetColor || '#C17B2A',
        greeting: body.greeting || 'Hi! How can I help you today?',
        isActive: true,
      },
    })

    return NextResponse.json({ client }, { status: 201 })
  } catch (error) {
    console.error('POST /api/clients error:', error)
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
  }
}
