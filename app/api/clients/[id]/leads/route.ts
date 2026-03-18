import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const client = await prisma.client.findUnique({
      where: { id },
      select: { id: true, businessName: true },
    })
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const leads = await prisma.lead.findMany({
      where: { clientId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        conversation: {
          select: { messages: true },
        },
      },
    })

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const leadsThisMonth = leads.filter(
      (l) => new Date(l.createdAt) >= startOfMonth
    ).length
    const sentToGHL = leads.filter((l) => l.sentToGHL).length
    const pendingGHL = leads.filter((l) => !l.sentToGHL).length

    return NextResponse.json({
      client,
      leads,
      stats: {
        total: leads.length,
        leadsThisMonth,
        sentToGHL,
        pendingGHL,
      },
    })
  } catch (error) {
    console.error('GET /api/clients/[id]/leads error:', error)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}
