import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET — Load client by slug for the standalone portal
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 })
  }

  const client = await prisma.agentClient.findUnique({
    where: { clientSlug: slug },
    select: {
      id: true,
      businessName: true,
      industry: true,
      ownerName: true,
      ownerFirstName: true,
      ownerEmail: true,
      city: true,
      state: true,
      memoriaEnabled: true,
      memoriaStandalone: true,
      intakeCompleted: true,
      memoriaGoals: true,
      memoriaStartDate: true,
    },
  })

  if (!client || !client.memoriaEnabled) {
    return NextResponse.json({ error: 'Portal not found' }, { status: 404 })
  }

  return NextResponse.json({ client })
}
