import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { invoiceId } = body

    if (!invoiceId) {
      return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 })
    }

    const invoice = await prisma.maxInvoice.update({
      where: { id: invoiceId },
      data: { status: 'paid', paidAt: new Date() },
    })

    return NextResponse.json({ success: true, invoice })
  } catch (error) {
    console.error('Max mark-paid error:', error)
    return NextResponse.json({ error: 'Failed to mark paid' }, { status: 500 })
  }
}
