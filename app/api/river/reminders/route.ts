import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const clientId = req.nextUrl.searchParams.get('clientId')
    if (!clientId) return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })
    const reminders = await prisma.appointmentReminder.findMany({
      where: { appointment: { clientId }, status: 'pending' },
      include: { appointment: { select: { customerName: true, customerPhone: true, serviceType: true, scheduledAt: true, providerName: true } } },
      orderBy: { scheduledFor: 'asc' },
    })
    return NextResponse.json({ reminders })
  } catch (error) {
    console.error('River reminders GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
