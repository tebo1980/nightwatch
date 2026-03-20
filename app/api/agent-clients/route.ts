import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const clients = await prisma.agentClient.findMany({
      where: { active: true },
      orderBy: { businessName: 'asc' },
      select: {
        id: true,
        businessName: true,
        ownerName: true,
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
        createdAt: true,
      },
    })

    return NextResponse.json({ clients })
  } catch (error) {
    console.error('GET /api/agent-clients error:', error)
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }
}
