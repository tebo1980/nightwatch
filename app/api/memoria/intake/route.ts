import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { clientId, dataType, periodStart, periodEnd, rawData } = body

  if (!clientId || !dataType || !periodStart || !periodEnd || !rawData) {
    return NextResponse.json(
      { error: 'clientId, dataType, periodStart, periodEnd, and rawData are required' },
      { status: 400 }
    )
  }

  const intake = await prisma.clientDataIntake.create({
    data: {
      clientId,
      dataType,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      rawData,
    },
  })

  return NextResponse.json({ intake })
}
