import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const configs = await prisma.clientBoltConfig.findMany({
      orderBy: { businessName: 'asc' },
      include: {
        estimates: {
          select: { id: true },
        },
      },
    })

    return NextResponse.json({
      configs: configs.map((c) => ({
        ...c,
        estimateCount: c.estimates.length,
        estimates: undefined,
      })),
    })
  } catch (error) {
    console.error('GET /api/bolt/config error:', error)
    return NextResponse.json({ error: 'Failed to fetch configs' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      clientId,
      clientSlug,
      businessName,
      businessPhone,
      businessEmail,
      businessAddress,
      logoUrl,
      licenseNumber,
      insuranceInfo,
      trade,
      laborRatePerHour,
      minimumJobSize,
      taxRate,
      paymentTerms,
      warrantyTerms,
      validityDays,
      escalationClause,
    } = body

    if (!clientId || !clientSlug || !businessName || !businessPhone || !businessEmail || !trade) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check for slug uniqueness
    const existingSlug = await prisma.clientBoltConfig.findUnique({
      where: { clientSlug },
    })
    if (existingSlug) {
      return NextResponse.json({ error: 'Client slug already in use' }, { status: 409 })
    }

    const config = await prisma.clientBoltConfig.create({
      data: {
        clientId,
        clientSlug,
        businessName,
        businessPhone,
        businessEmail,
        businessAddress: businessAddress || null,
        logoUrl: logoUrl || null,
        licenseNumber: licenseNumber || null,
        insuranceInfo: insuranceInfo || null,
        trade,
        laborRatePerHour: laborRatePerHour ?? 75,
        minimumJobSize: minimumJobSize ?? 150,
        taxRate: taxRate ?? 0,
        paymentTerms: paymentTerms || '50% deposit required to schedule. Balance due upon completion.',
        warrantyTerms: warrantyTerms || 'All work warranted for 1 year from completion date.',
        validityDays: validityDays ?? 14,
        escalationClause: escalationClause ?? true,
      },
    })

    return NextResponse.json({ config })
  } catch (error) {
    console.error('POST /api/bolt/config error:', error)
    return NextResponse.json({ error: 'Failed to create config' }, { status: 500 })
  }
}
