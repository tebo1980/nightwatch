import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId')

  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
  }

  try {
    const client = await prisma.agentClient.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        businessName: true,
        ownerName: true,
        ownerFirstName: true,
        industry: true,
        city: true,
        state: true,
        tier: true,
        novaEnabled: true,
        rexEnabled: true,
        irisEnabled: true,
        maxEnabled: true,
        dellaEnabled: true,
        flynnEnabled: true,
        coleEnabled: true,
        riverEnabled: true,
        sageEnabled: true,
        atlasEnabled: true,
        memoriaEnabled: true,
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Portal API error:', error)
    return NextResponse.json({ error: 'Failed to load client' }, { status: 500 })
  }
}
