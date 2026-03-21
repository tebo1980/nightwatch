import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const targets = await prisma.scraperTarget.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { logs: true } } },
    })
    return NextResponse.json({ targets })
  } catch (error) {
    console.error('Scraper targets GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, category, url, priceSelector, targetTable, targetField, targetRecordId, frequency } = body
    if (!name || !url || !priceSelector || !targetTable || !targetField || !targetRecordId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const target = await prisma.scraperTarget.create({
      data: {
        name, category: category || 'Other', url, priceSelector,
        targetTable, targetField, targetRecordId,
        frequency: frequency || 'weekly', isActive: true,
      },
    })
    return NextResponse.json({ success: true, target })
  } catch (error) {
    console.error('Scraper targets POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
