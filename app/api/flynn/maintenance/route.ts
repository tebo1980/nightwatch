import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const clientId = req.nextUrl.searchParams.get('clientId')
    if (!clientId) return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })
    const logs = await prisma.maintenanceLog.findMany({
      where: { vehicle: { clientId } },
      include: { vehicle: { select: { vehicleName: true } } },
      orderBy: { date: 'desc' },
      take: 50,
    })
    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Flynn maintenance GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { vehicleId, date, type, cost, mileageAtService, notes, nextDueMileage } = body
    if (!vehicleId || !date || !type || cost === undefined || !mileageAtService) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const log = await prisma.maintenanceLog.create({
      data: {
        vehicleId, date: new Date(date), type, cost: Number(cost),
        mileageAtService: Number(mileageAtService), notes: notes || null,
        nextDueMileage: nextDueMileage ? Number(nextDueMileage) : null,
      },
    })
    await prisma.flynnVehicle.update({ where: { id: vehicleId }, data: { currentMileage: Number(mileageAtService) } })
    return NextResponse.json({ success: true, log })
  } catch (error) {
    console.error('Flynn maintenance POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
