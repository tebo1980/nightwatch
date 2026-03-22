import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const estimate = await prisma.estimate.findUnique({
      where: { id },
      include: { boltConfig: true },
    })

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
    }

    return NextResponse.json({ estimate })
  } catch (error) {
    console.error('GET /api/bolt/estimates/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch estimate' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { status, sentAt, approvedAt, pdfUrl, notes, internalNotes } = body

    const data: Record<string, unknown> = {}
    if (status !== undefined) data.status = status
    if (sentAt !== undefined) data.sentAt = sentAt ? new Date(sentAt) : null
    if (approvedAt !== undefined) data.approvedAt = approvedAt ? new Date(approvedAt) : null
    if (pdfUrl !== undefined) data.pdfUrl = pdfUrl
    if (notes !== undefined) data.notes = notes
    if (internalNotes !== undefined) data.internalNotes = internalNotes

    const estimate = await prisma.estimate.update({
      where: { id },
      data,
    })

    return NextResponse.json({ estimate })
  } catch (error) {
    console.error('PATCH /api/bolt/estimates/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update estimate' }, { status: 500 })
  }
}
