import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const clientId = req.nextUrl.searchParams.get('clientId')
    if (!clientId) return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })
    const vehicles = await prisma.flynnVehicle.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: { maintenanceLogs: { orderBy: { date: 'desc' }, take: 5 } },
    })
    return NextResponse.json({ vehicles })
  } catch (error) {
    console.error('Flynn vehicles GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clientId, vehicleName, make, model, year, licensePlate, currentMileage } = body
    if (!clientId || !vehicleName || !make || !model || !year || currentMileage === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const vehicle = await prisma.flynnVehicle.create({
      data: { clientId, vehicleName, make, model, year: Number(year), licensePlate: licensePlate || null, currentMileage: Number(currentMileage) },
    })
    return NextResponse.json({ success: true, vehicle })
  } catch (error) {
    console.error('Flynn vehicles POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
