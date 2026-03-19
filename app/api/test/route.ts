import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const rawUrl = process.env.DATABASE_URL || ''
  const hasPgbouncer = rawUrl.includes('pgbouncer=true')
  const port = rawUrl.match(/:(\d+)\//)?.[1] || 'unknown'

  try {
    const count = await prisma.client.count()
    const clients = await prisma.client.findMany({ take: 5 })
    return NextResponse.json({
      count,
      clients,
      debug: { port, hasPgbouncer, urlStart: rawUrl.substring(0, 60) },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: String(error),
        debug: { port, hasPgbouncer, urlStart: rawUrl.substring(0, 60) },
      },
      { status: 500 }
    )
  }
}
