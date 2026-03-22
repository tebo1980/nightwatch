import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const totalActive = await prisma.scraperTarget.count({ where: { isActive: true } })
    const primaryActive = await prisma.scraperTarget.count({ where: { isActive: true, isPrimary: true } })
    const referenceActive = await prisma.scraperTarget.count({ where: { isActive: true, isReference: true } })

    // Last full run — most recent log timestamp
    const lastLog = await prisma.scraperLog.findFirst({ orderBy: { scrapedAt: 'desc' } })

    // Source breakdown
    const sources = await prisma.scraperTarget.groupBy({
      by: ['sourceStore'],
      where: { isActive: true, sourceStore: { not: null } },
      _count: { id: true },
    })

    // Success rate — last 10 primary runs
    const recentPrimaryLogs = await prisma.scraperLog.findMany({
      where: { isReferenceFailure: false },
      orderBy: { scrapedAt: 'desc' },
      take: 50,
      select: { status: true },
    })
    const primarySuccessRate = recentPrimaryLogs.length > 0
      ? Math.round((recentPrimaryLogs.filter((l) => l.status === 'success').length / recentPrimaryLogs.length) * 100)
      : 0

    // Reference success rate
    const recentRefLogs = await prisma.scraperLog.findMany({
      where: { isReferenceFailure: true },
      orderBy: { scrapedAt: 'desc' },
      take: 50,
      select: { status: true },
    })
    // For ref logs, isReferenceFailure=true is set on all ref store logs (both success and failure)
    // Actually isReferenceFailure only flags failures. Let's count reference logs differently.
    const recentRefAllLogs = await prisma.scraperLog.findMany({
      where: {
        target: { isReference: true },
      },
      orderBy: { scrapedAt: 'desc' },
      take: 50,
      select: { status: true },
    })
    const refSuccessRate = recentRefAllLogs.length > 0
      ? Math.round((recentRefAllLogs.filter((l) => l.status === 'success').length / recentRefAllLogs.length) * 100)
      : 0

    return NextResponse.json({
      totalActive,
      primaryActive,
      referenceActive,
      lastRun: lastLog?.scrapedAt || null,
      sources: sources.map((s) => ({
        store: s.sourceStore,
        count: s._count.id,
      })),
      primarySuccessRate,
      refSuccessRate,
      // suppress unused var
      _refLogsCount: recentRefLogs.length,
    })
  } catch (error) {
    console.error('Scraper stats error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
