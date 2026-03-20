import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { reviewId, finalResponse } = body

    if (!reviewId || !finalResponse) {
      return NextResponse.json({ error: 'Missing reviewId or finalResponse' }, { status: 400 })
    }

    const review = await prisma.review.update({
      where: { id: reviewId },
      data: { finalResponse, status: 'approved' },
    })

    return NextResponse.json({ success: true, review })
  } catch (error) {
    console.error('Rex approve error:', error)
    return NextResponse.json({ error: 'Failed to approve' }, { status: 500 })
  }
}
