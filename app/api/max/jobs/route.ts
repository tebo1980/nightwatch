import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const clientId = req.nextUrl.searchParams.get('clientId')
    if (!clientId) {
      return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })
    }

    const jobs = await prisma.maxJob.findMany({
      where: { clientId },
      orderBy: { completedAt: 'desc' },
    })

    return NextResponse.json({ jobs })
  } catch (error) {
    console.error('Max jobs error:', error)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}
