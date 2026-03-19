import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const count = await prisma.client.count()
    const clients = await prisma.client.findMany({ take: 5 })
    return NextResponse.json({
      count,
      clients,
      dbUrl: process.env.DATABASE_URL?.substring(0, 50) + '...',
      directUrl: process.env.DIRECT_URL?.substring(0, 50) + '...',
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: String(error),
        dbUrl: process.env.DATABASE_URL?.substring(0, 50) + '...',
      },
      { status: 500 }
    )
  }
}
