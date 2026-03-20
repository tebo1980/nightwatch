import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { leadId, status } = body

    if (!leadId) {
      return NextResponse.json({ error: 'Missing leadId' }, { status: 400 })
    }

    const newStatus = status || 'converted'
    const lead = await prisma.irisLead.update({
      where: { id: leadId },
      data: {
        status: newStatus,
        convertedAt: newStatus === 'converted' ? new Date() : null,
        nextFollowUpAt: null,
      },
    })

    return NextResponse.json({ success: true, lead })
  } catch (error) {
    console.error('Iris convert error:', error)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }
}
