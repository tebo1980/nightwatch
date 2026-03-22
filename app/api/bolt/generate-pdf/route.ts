import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { estimateId } = await req.json()

    if (!estimateId) {
      return NextResponse.json({ error: 'Missing estimateId' }, { status: 400 })
    }

    const estimate = await prisma.estimate.findUnique({
      where: { id: estimateId },
      include: { boltConfig: true },
    })

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
    }

    // PDF generation will be implemented in Bolt Prompt 2
    // For now, return the estimate data structured for PDF rendering
    return NextResponse.json({
      success: true,
      message: 'PDF generation endpoint ready — implementation in Bolt Prompt 2',
      estimate,
    })
  } catch (error) {
    console.error('POST /api/bolt/generate-pdf error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
