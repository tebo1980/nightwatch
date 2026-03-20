import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const clientId = req.nextUrl.searchParams.get('clientId')
    if (!clientId) return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })
    const logs = await prisma.fuelLog.findMany({
      where: { vehicle: { clientId } },
      include: { vehicle: { select: { vehicleName: true } } },
      orderBy: { date: 'desc' },
      take: 50,
    })
    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Flynn fuel GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { vehicleId, date, gallons, costPerGallon, mileageAtFill } = body
    if (!vehicleId || !date || !gallons || !costPerGallon || !mileageAtFill) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const totalCost = Number(gallons) * Number(costPerGallon)
    const log = await prisma.fuelLog.create({
      data: { vehicleId, date: new Date(date), gallons: Number(gallons), costPerGallon: Number(costPerGallon), totalCost, mileageAtFill: Number(mileageAtFill) },
    })
    await prisma.flynnVehicle.update({ where: { id: vehicleId }, data: { currentMileage: Number(mileageAtFill) } })
    return NextResponse.json({ success: true, log })
  } catch (error) {
    console.error('Flynn fuel POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
