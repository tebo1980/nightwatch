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

    // Process clients sequentially to avoid exhausting the Supabase connection pool
    const clientsWithStats = []
    for (const client of clients) {
      const leadsThisMonth = await prisma.lead.count({
        where: { clientId: client.id, createdAt: { gte: startOfMonth } },
      })
      const convsThisMonth = await prisma.conversation.count({
        where: { clientId: client.id, createdAt: { gte: startOfMonth } },
      })
      const ghlSentThisMonth = await prisma.lead.count({
        where: {
          clientId: client.id,
          sentToGHL: true,
          createdAt: { gte: startOfMonth },
        },
      })
      const lastConv = await prisma.conversation.findFirst({
        where: { clientId: client.id },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      })

      clientsWithStats.push({
        ...client,
        leadsThisMonth,
        convsThisMonth,
        ghlSentThisMonth,
        lastActivity: lastConv?.updatedAt || null,
      })
    }

    console.log(`GET /api/clients — found ${clientsWithStats.length} clients`)
    return NextResponse.json({ clients: clientsWithStats })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    console.error('GET /api/clients error:', msg)
    if (stack) console.error(stack)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate required fields
    const required = [
      'businessName',
      'agentName',
      'agentPersonality',
      'serviceArea',
      'jobTypes',
      'pricingRanges',
      'businessHours',
      'phoneNumber',
      'email',
    ] as const

    const missing = required.filter((f) => !body[f] && body[f] !== false)
    if (missing.length > 0) {
      console.error('POST /api/clients — missing fields:', missing)
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    // Ensure JSON-string fields are actually strings
    for (const field of ['jobTypes', 'pricingRanges', 'businessHours'] as const) {
      if (typeof body[field] !== 'string') {
        body[field] = JSON.stringify(body[field])
      }
    }

    const client = await prisma.client.create({
      data: {
        businessName: body.businessName,
        agentName: body.agentName,
        agentPersonality: body.agentPersonality,
        serviceArea: body.serviceArea,
        jobTypes: body.jobTypes,
        pricingRanges: body.pricingRanges,
        emergencyAvail: body.emergencyAvail ?? false,
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
    const msg = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    console.error('POST /api/clients error:', msg)
    if (stack) console.error(stack)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
