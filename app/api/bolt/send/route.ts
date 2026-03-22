import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { estimateId, method } = await req.json()

    if (!estimateId || !method) {
      return NextResponse.json({ error: 'Missing estimateId or method' }, { status: 400 })
    }

    const estimate = await prisma.estimate.findUnique({
      where: { id: estimateId },
      include: { boltConfig: true },
    })

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
    }

    // Send functionality will be implemented in Bolt Prompt 2
    // For now, mark the estimate as sent
    await prisma.estimate.update({
      where: { id: estimateId },
      data: { status: 'sent', sentAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      message: `Estimate marked as sent via ${method} — full send implementation in Bolt Prompt 2`,
    })
  } catch (error) {
    console.error('POST /api/bolt/send error:', error)
    return NextResponse.json({ error: 'Failed to send estimate' }, { status: 500 })
  }
}
