import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const targetId = req.nextUrl.searchParams.get('targetId')
    const status = req.nextUrl.searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (targetId) where.targetId = targetId
    if (status) where.status = status

    const logs = await prisma.scraperLog.findMany({
      where,
      include: { target: { select: { name: true } } },
      orderBy: { scrapedAt: 'desc' },
      take: 100,
    })
    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Scraper logs GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
