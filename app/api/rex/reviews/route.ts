import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const clientId = req.nextUrl.searchParams.get('clientId')
    if (!clientId) {
      return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })
    }

    const reviews = await prisma.review.findMany({
      where: { clientId },
      orderBy: { reviewDate: 'desc' },
    })

    return NextResponse.json({ reviews })
  } catch (error) {
    console.error('Rex reviews error:', error)
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clientId, platform, reviewerName, rating, reviewText, reviewDate } = body

    if (!clientId || !reviewerName || !rating || !reviewText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const review = await prisma.review.create({
      data: {
        clientId,
        platform: platform || 'manual',
        reviewerName,
        rating,
        reviewText,
        reviewDate: reviewDate ? new Date(reviewDate) : new Date(),
        status: 'pending',
      },
    })

    return NextResponse.json({ success: true, review })
  } catch (error) {
    console.error('Rex add review error:', error)
    return NextResponse.json({ error: 'Failed to add review' }, { status: 500 })
  }
}
