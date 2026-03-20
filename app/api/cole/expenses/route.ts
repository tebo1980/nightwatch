import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const clientId = req.nextUrl.searchParams.get('clientId')
    if (!clientId) return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })
    const expenses = await prisma.expenseEntry.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: 100,
    })
    return NextResponse.json({ expenses })
  } catch (error) {
    console.error('Cole expenses GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clientId, date, vendor, category, description, amount, jobReference } = body
    if (!clientId || !date || !vendor || !category || !description || amount === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const expense = await prisma.expenseEntry.create({
      data: { clientId, date: new Date(date), vendor, category, description, amount: Number(amount), jobReference: jobReference || null },
    })
    return NextResponse.json({ success: true, expense })
  } catch (error) {
    console.error('Cole expenses POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
