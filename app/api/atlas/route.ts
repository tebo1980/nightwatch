import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const trade = req.nextUrl.searchParams.get('trade')
    const where: Record<string, unknown> = {}
    if (trade) where.trade = trade

    const materials = await prisma.materialPrice.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        alerts: {
          where: { acknowledged: false },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })

    // Get distinct trades for filter
    const trades = await prisma.materialPrice.findMany({
      select: { trade: true },
      distinct: ['trade'],
      orderBy: { trade: 'asc' },
    })

    return NextResponse.json({
      materials,
      trades: trades.map((t) => t.trade),
    })
  } catch (error) {
    console.error('Atlas GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
