import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const clientId = req.nextUrl.searchParams.get('clientId')
    if (!clientId) {
      return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })
    }

    const drafts = await prisma.dellaDraft.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ drafts })
  } catch (error) {
    console.error('Della drafts error:', error)
    return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 })
  }
}
