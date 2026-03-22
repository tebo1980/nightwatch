import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const trade = req.nextUrl.searchParams.get('trade')

    if (!trade) {
      return NextResponse.json({ error: 'Missing trade parameter' }, { status: 400 })
    }

    const materials = await prisma.materialPrice.findMany({
      where: { trade },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        unit: true,
        currentPrice: true,
        lowPrice: true,
        highPrice: true,
      },
    })

    return NextResponse.json(
      materials.map((m) => ({
        id: m.id,
        materialName: m.name,
        unit: m.unit,
        currentPrice: m.currentPrice ?? 0,
        lowPrice: m.lowPrice ?? null,
        highPrice: m.highPrice ?? null,
      }))
    )
  } catch (error) {
    console.error('GET /api/atlas/prices-by-trade error:', error)
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 })
  }
}
