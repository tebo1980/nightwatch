import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const clientId = req.nextUrl.searchParams.get('clientId')
    if (!clientId) return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })
    const jobs = await prisma.jobRevenue.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: 100,
    })
    return NextResponse.json({ jobs })
  } catch (error) {
    console.error('Cole revenue GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clientId, date, jobName, jobType, revenue, notes } = body
    if (!clientId || !date || !jobName || !jobType || revenue === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const job = await prisma.jobRevenue.create({
      data: { clientId, date: new Date(date), jobName, jobType, revenue: Number(revenue), notes: notes || null },
    })
    return NextResponse.json({ success: true, job })
  } catch (error) {
    console.error('Cole revenue POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
