import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const target = await prisma.scraperTarget.update({
      where: { id },
      data: body,
    })
    return NextResponse.json({ success: true, target })
  } catch (error) {
    console.error('Scraper target PATCH error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.scraperLog.deleteMany({ where: { targetId: id } })
    await prisma.scraperTarget.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Scraper target DELETE error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
