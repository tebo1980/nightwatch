import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const clientId = req.nextUrl.searchParams.get('clientId')
    if (!clientId) {
      return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })
    }

    const invoices = await prisma.maxInvoice.findMany({
      where: { clientId },
      include: { reminders: { orderBy: { reminderNum: 'asc' } } },
      orderBy: { dueDate: 'asc' },
    })

    return NextResponse.json({ invoices })
  } catch (error) {
    console.error('Max invoices error:', error)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}
