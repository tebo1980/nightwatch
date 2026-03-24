import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40)
    + '-' + Math.random().toString(36).substring(2, 8)
}

// GET — List all standalone Memoria clients
export async function GET() {
  try {
    const clients = await prisma.agentClient.findMany({
      where: { memoriaStandalone: true, active: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        businessName: true,
        industry: true,
        ownerName: true,
        ownerEmail: true,
        city: true,
        state: true,
        clientSlug: true,
        memoriaEnabled: true,
        memoriaStandalone: true,
        memoriaStartDate: true,
        intakeCompleted: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ clients })
  } catch (error) {
    console.error('Standalone clients error:', error)
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }
}

// POST — Create a new standalone Memoria client
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      businessName,
      industry,
      ownerName,
      ownerFirstName,
      ownerEmail,
      contactPhone,
      city,
      state,
      yearsInBusiness,
      annualRevenue,
      employees,
    } = body

    if (!businessName || !industry || !ownerName || !ownerEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const slug = generateSlug(businessName)

    const client = await prisma.agentClient.create({
      data: {
        businessName,
        industry,
        ownerName,
        ownerFirstName: ownerFirstName || ownerName.split(' ')[0],
        ownerEmail,
        contactPhone: contactPhone || null,
        city: city || 'Louisville',
        state: state || 'KY',
        servicesOffered: industry,
        tier: 'memoria_standalone',
        memoriaEnabled: true,
        memoriaStandalone: true,
        memoriaStartDate: new Date(),
        clientSlug: slug,
        notes: JSON.stringify({
          yearsInBusiness: yearsInBusiness || null,
          annualRevenue: annualRevenue || null,
          employees: employees || null,
        }),
      },
    })

    return NextResponse.json({ client, slug })
  } catch (error) {
    console.error('Create standalone client error:', error)
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
  }
}

// PATCH — Update standalone client (goals, intake status, etc.)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { clientId, ...updates } = body

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (updates.memoriaGoals !== undefined) data.memoriaGoals = updates.memoriaGoals
    if (updates.intakeCompleted !== undefined) data.intakeCompleted = updates.intakeCompleted

    const client = await prisma.agentClient.update({
      where: { id: clientId },
      data,
    })

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Update standalone client error:', error)
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
  }
}
