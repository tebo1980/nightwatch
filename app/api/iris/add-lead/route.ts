import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clientId, leadName, leadEmail, leadPhone, source, serviceNeeded, initialMessage, novaLeadId } = body

    if (!clientId || !leadName) {
      return NextResponse.json({ error: 'Missing clientId or leadName' }, { status: 400 })
    }

    const client = await prisma.agentClient.findUnique({ where: { id: clientId } })
    if (!client || !client.irisEnabled) {
      return NextResponse.json({ error: 'Client not found or Iris not enabled' }, { status: 400 })
    }

    const nextFollowUp = new Date()
    nextFollowUp.setDate(nextFollowUp.getDate() + client.irisFollowUpDay1)

    const lead = await prisma.irisLead.create({
      data: {
        clientId,
        novaLeadId: novaLeadId || null,
        leadName,
        leadEmail: leadEmail || null,
        leadPhone: leadPhone || null,
        source: source || 'manual',
        serviceNeeded: serviceNeeded || null,
        initialMessage: initialMessage || null,
        status: 'new',
        nextFollowUpAt: nextFollowUp,
      },
    })

    return NextResponse.json({ success: true, lead })
  } catch (error) {
    console.error('Iris add-lead error:', error)
    return NextResponse.json({ error: 'Failed to add lead' }, { status: 500 })
  }
}
