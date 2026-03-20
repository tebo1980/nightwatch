import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clientId, customerName, customerEmail, customerPhone, serviceProvided, jobValue, completedAt, notes } = body

    if (!clientId || !customerName || !serviceProvided || !completedAt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const client = await prisma.agentClient.findUnique({ where: { id: clientId } })
    if (!client || !client.maxEnabled) {
      return NextResponse.json({ error: 'Client not found or Max not enabled' }, { status: 400 })
    }

    const job = await prisma.maxJob.create({
      data: {
        clientId,
        customerName,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        serviceProvided,
        jobValue: jobValue ? parseFloat(jobValue) : null,
        completedAt: new Date(completedAt),
        notes: notes || null,
      },
    })

    return NextResponse.json({ success: true, job })
  } catch (error) {
    console.error('Max add-job error:', error)
    return NextResponse.json({ error: 'Failed to add job' }, { status: 500 })
  }
}
