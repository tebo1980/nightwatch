import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scrapeTarget as runScrape, parsePrice } from '@/lib/scraper-engine'

interface RunResult {
  id: string
  name: string
  status: 'success' | 'failed'
  result?: string
  price?: number | null
  error?: string
}

async function processTarget(target: {
  id: string; name: string; url: string; priceSelector: string
  targetTable: string; targetField: string; targetRecordId: string
  lastResult: string | null
}): Promise<RunResult> {
  try {
    const scrapeResult = await runScrape(target.url, target.priceSelector)

    if (!scrapeResult.success) {
      await prisma.scraperLog.create({
        data: { targetId: target.id, status: 'failed', errorMsg: scrapeResult.error },
      })
      await prisma.scraperTarget.update({
        where: { id: target.id },
        data: { lastScraped: new Date(), lastStatus: 'failed' },
      })
      return { id: target.id, name: target.name, status: 'failed', error: scrapeResult.error }
    }

    const rawResult = scrapeResult.result || ''
    const price = parsePrice(rawResult)

    // Update the scraper target record
    await prisma.scraperTarget.update({
      where: { id: target.id },
      data: { lastScraped: new Date(), lastResult: rawResult, lastStatus: 'success' },
    })

    // Log success
    await prisma.scraperLog.create({
      data: { targetId: target.id, result: rawResult, status: 'success' },
    })

    // If target table is MaterialPrice, update the record and check for price alerts
    // MaterialPrice and PriceAlert models will be added in a future migration.
    // When they exist, uncomment and use the block below.
    //
    // if (target.targetTable === 'MaterialPrice' && price !== null) {
    //   const previousPrice = target.lastResult ? parsePrice(target.lastResult) : null
    //   await prisma.materialPrice.update({
    //     where: { id: target.targetRecordId },
    //     data: {
    //       [target.targetField]: price,
    //       percentChange: previousPrice ? ((price - previousPrice) / previousPrice) * 100 : null,
    //       updatedAt: new Date(),
    //     },
    //   })
    //   // Create PriceAlert if change exceeds 10%
    //   if (previousPrice && Math.abs((price - previousPrice) / previousPrice) > 0.10) {
    //     await prisma.priceAlert.create({
    //       data: {
    //         targetId: target.id,
    //         previousPrice,
    //         newPrice: price,
    //         percentChange: ((price - previousPrice) / previousPrice) * 100,
    //       },
    //     })
    //   }
    // }

    return { id: target.id, name: target.name, status: 'success', result: rawResult, price }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    try {
      await prisma.scraperLog.create({
        data: { targetId: target.id, status: 'failed', errorMsg },
      })
      await prisma.scraperTarget.update({
        where: { id: target.id },
        data: { lastScraped: new Date(), lastStatus: 'failed' },
      })
    } catch (dbErr) {
      console.error('Failed to log scraper error:', dbErr)
    }
    return { id: target.id, name: target.name, status: 'failed', error: errorMsg }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { targetId, runAll, testOnly, url, selector } = body

    // Test mode — scrape without saving
    if (testOnly && url && selector) {
      const scrapeResult = await runScrape(url, selector)
      if (scrapeResult.success) {
        const price = scrapeResult.result ? parsePrice(scrapeResult.result) : null
        return NextResponse.json({ success: true, result: scrapeResult.result || null, price, found: !!scrapeResult.result })
      }
      return NextResponse.json({ success: false, error: scrapeResult.error })
    }

    // Run single target
    if (targetId) {
      const target = await prisma.scraperTarget.findUnique({ where: { id: targetId } })
      if (!target) return NextResponse.json({ error: 'Target not found' }, { status: 404 })
      const result = await processTarget(target)
      return NextResponse.json({ success: true, results: [result] })
    }

    // Run all active targets
    if (runAll) {
      const targets = await prisma.scraperTarget.findMany({ where: { isActive: true } })
      const results: RunResult[] = []
      const failures: { name: string; error: string }[] = []

      for (const target of targets) {
        const result = await processTarget(target)
        results.push(result)
        if (result.status === 'failed') {
          failures.push({ name: target.name, error: result.error || 'Unknown error' })
        }
      }

      const succeeded = results.filter((r) => r.status === 'success').length
      const failed = results.filter((r) => r.status === 'failed').length

      return NextResponse.json({
        success: true,
        results,
        summary: { succeeded, failed, total: targets.length },
        failures,
      })
    }

    return NextResponse.json({ error: 'Provide targetId, runAll, or testOnly' }, { status: 400 })
  } catch (error) {
    console.error('Scraper run error:', error)
    return NextResponse.json({ error: 'Run failed' }, { status: 500 })
  }
}
