import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const clientId = req.nextUrl.searchParams.get('clientId')
    const clientSlug = req.nextUrl.searchParams.get('clientSlug')

    const where: Record<string, unknown> = {}
    if (clientId) where.clientId = clientId
    if (clientSlug) {
      const config = await prisma.clientBoltConfig.findUnique({
        where: { clientSlug },
        select: { clientId: true },
      })
      if (!config) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
      where.clientId = config.clientId
    }

    const estimates = await prisma.estimate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ estimates })
  } catch (error) {
    console.error('GET /api/bolt/estimates error:', error)
    return NextResponse.json({ error: 'Failed to fetch estimates' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      clientId,
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      jobType,
      jobDescription,
      lineItems,
      laborHours,
      laborRate,
      laborTotal,
      materialsTotal,
      subtotal,
      taxAmount,
      totalAmount,
      depositRequired,
      validUntil,
      notes,
      internalNotes,
    } = body

    if (!clientId || !customerName || !customerPhone || !customerAddress || !jobType || !jobDescription) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify the client has a Bolt config
    const config = await prisma.clientBoltConfig.findUnique({
      where: { clientId },
    })
    if (!config) {
      return NextResponse.json({ error: 'Client not configured for Bolt' }, { status: 404 })
    }

    // Generate estimate number: BT-[slug initials]-[YYMMDD]-[seq]
    const today = new Date()
    const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '')
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const countToday = await prisma.estimate.count({
      where: {
        clientId,
        createdAt: { gte: todayStart },
      },
    })
    const seq = String(countToday + 1).padStart(2, '0')
    const slugInitials = config.clientSlug
      .split('-')
      .map((w) => w[0]?.toUpperCase() || '')
      .join('')
      .slice(0, 3)
    const estimateNumber = `BT-${slugInitials}-${dateStr}-${seq}`

    const estimate = await prisma.estimate.create({
      data: {
        clientId,
        estimateNumber,
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        customerAddress,
        jobType,
        jobDescription,
        lineItems: lineItems || [],
        laborHours: laborHours ?? 0,
        laborRate: laborRate ?? config.laborRatePerHour,
        laborTotal: laborTotal ?? 0,
        materialsTotal: materialsTotal ?? 0,
        subtotal: subtotal ?? 0,
        taxAmount: taxAmount ?? 0,
        totalAmount: totalAmount ?? 0,
        depositRequired: depositRequired ?? 0,
        validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + config.validityDays * 86400000),
        notes: notes || null,
        internalNotes: internalNotes || null,
      },
    })

    return NextResponse.json({ estimate })
  } catch (error) {
    console.error('POST /api/bolt/estimates error:', error)
    return NextResponse.json({ error: 'Failed to create estimate' }, { status: 500 })
  }
}
