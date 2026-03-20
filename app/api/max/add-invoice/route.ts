import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clientId, customerName, customerEmail, customerPhone, invoiceNumber, amount, description, dueDate } = body

    if (!clientId || !customerName || !amount || !dueDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const client = await prisma.agentClient.findUnique({ where: { id: clientId } })
    if (!client || !client.maxEnabled) {
      return NextResponse.json({ error: 'Client not found or Max not enabled' }, { status: 400 })
    }

    const invoice = await prisma.maxInvoice.create({
      data: {
        clientId,
        customerName,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        invoiceNumber: invoiceNumber || null,
        amount: parseFloat(amount),
        description: description || null,
        dueDate: new Date(dueDate),
        status: 'unpaid',
      },
    })

    return NextResponse.json({ success: true, invoice })
  } catch (error) {
    console.error('Max add-invoice error:', error)
    return NextResponse.json({ error: 'Failed to add invoice' }, { status: 500 })
  }
}
