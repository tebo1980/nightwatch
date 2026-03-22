import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  scrapeTarget as runScrape,
  parsePrice,
  isReferenceStore,
  isPrimaryStore,
  getStorePriceField,
  recalculatePrices,
} from '@/lib/scraper-engine'

interface RunResult {
  id: string
  name: string
  status: 'success' | 'failed'
  result?: string
  price?: number | null
  error?: string
  isReference?: boolean
}

async function processTarget(target: {
  id: string
  name: string
  url: string
  priceSelector: string
  targetTable: string
  targetField: string
  targetRecordId: string
  lastResult: string | null
  sourceStore: string | null
  isPrimary: boolean
  isReference: boolean
}): Promise<RunResult> {
  const isRef = isReferenceStore(target.sourceStore)

  try {
    const scrapeResult = await runScrape(target.url, target.priceSelector, target.sourceStore)

    if (!scrapeResult.success) {
      await prisma.scraperLog.create({
        data: {
          targetId: target.id,
          status: 'failed',
          errorMsg: scrapeResult.error,
          isReferenceFailure: isRef,
        },
      })
      await prisma.scraperTarget.update({
        where: { id: target.id },
        data: { lastScraped: new Date(), lastStatus: 'failed' },
      })
      return { id: target.id, name: target.name, status: 'failed', error: scrapeResult.error, isReference: isRef }
    }

    const rawResult = scrapeResult.result || ''
    const price = parsePrice(rawResult)

    // Reject $0.00 prices — indicates bot detection serving fake/empty price
    if (price !== null && price === 0) {
      await prisma.scraperLog.create({
        data: {
          targetId: target.id,
          status: 'failed',
          result: rawResult,
          errorMsg: 'Price returned as $0.00 — likely bot detection serving empty price',
          isReferenceFailure: isRef,
        },
      })
      await prisma.scraperTarget.update({
        where: { id: target.id },
        data: { lastScraped: new Date(), lastStatus: 'failed' },
      })
      return {
        id: target.id,
        name: target.name,
        status: 'failed',
        result: rawResult,
        error: 'Price returned as $0.00 — bot detection detected',
        isReference: isRef,
      }
    }

    // Update the scraper target record
    await prisma.scraperTarget.update({
      where: { id: target.id },
      data: { lastScraped: new Date(), lastResult: rawResult, lastStatus: 'success' },
    })

    // Log success
    await prisma.scraperLog.create({
      data: {
        targetId: target.id,
        result: rawResult,
        status: 'success',
        isReferenceFailure: false,
      },
    })

    // If target table is MaterialPrice, update the store-specific price field
    if (target.targetTable === 'MaterialPrice' && price !== null && target.sourceStore) {
      const priceField = getStorePriceField(target.sourceStore)

      if (priceField) {
        try {
          // Update the store-specific price field
          await prisma.materialPrice.update({
            where: { id: target.targetRecordId },
            data: {
              [priceField]: price,
              updatedAt: new Date(),
            },
          })

          // Recalculate currentPrice from primary sources only
          if (isPrimaryStore(target.sourceStore)) {
            const material = await prisma.materialPrice.findUnique({
              where: { id: target.targetRecordId },
            })

            if (material) {
              const previousPrice = material.currentPrice
              const recalc = recalculatePrices(material)

              await prisma.materialPrice.update({
                where: { id: target.targetRecordId },
                data: {
                  previousPrice: previousPrice,
                  currentPrice: recalc.currentPrice,
                  lowPrice: recalc.lowPrice,
                  highPrice: recalc.highPrice,
                  percentChange:
                    previousPrice && recalc.currentPrice
                      ? Math.round(((recalc.currentPrice - previousPrice) / previousPrice) * 10000) / 100
                      : null,
                  primarySource: target.sourceStore,
                  updatedAt: new Date(),
                },
              })

              // Create PriceAlert if primary source price changed > 10%
              if (previousPrice && recalc.currentPrice) {
                const pctChange = Math.abs((recalc.currentPrice - previousPrice) / previousPrice)
                if (pctChange > 0.10) {
                  await prisma.priceAlert.create({
                    data: {
                      materialId: target.targetRecordId,
                      sourceStore: target.sourceStore,
                      previousPrice,
                      newPrice: recalc.currentPrice,
                      percentChange: Math.round(((recalc.currentPrice - previousPrice) / previousPrice) * 10000) / 100,
                    },
                  })
                }
              }
            }
          }
          // Reference stores: just save their price field, no recalculation, no alerts
        } catch (dbErr) {
          console.error(`[Scraper] Failed to update MaterialPrice for ${target.name}:`, dbErr)
        }
      }
    }

    return { id: target.id, name: target.name, status: 'success', result: rawResult, price, isReference: isRef }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    try {
      await prisma.scraperLog.create({
        data: { targetId: target.id, status: 'failed', errorMsg, isReferenceFailure: isRef },
      })
      await prisma.scraperTarget.update({
        where: { id: target.id },
        data: { lastScraped: new Date(), lastStatus: 'failed' },
      })
    } catch (dbErr) {
      console.error('Failed to log scraper error:', dbErr)
    }
    return { id: target.id, name: target.name, status: 'failed', error: errorMsg, isReference: isRef }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { targetId, runAll, testOnly, url, selector, materialId } = body

    // Test mode — scrape without saving
    if (testOnly && url && selector) {
      const scrapeResult = await runScrape(url, selector)
      if (scrapeResult.success) {
        const price = scrapeResult.result ? parsePrice(scrapeResult.result) : null
        return NextResponse.json({ success: true, result: scrapeResult.result || null, price, found: !!scrapeResult.result })
      }
      return NextResponse.json({ success: false, error: scrapeResult.error })
    }

    // Run all targets for a specific material
    if (materialId) {
      const targets = await prisma.scraperTarget.findMany({
        where: { targetRecordId: materialId, targetTable: 'MaterialPrice', isActive: true },
      })
      const results: RunResult[] = []
      for (const target of targets) {
        const result = await processTarget(target)
        results.push(result)
      }
      const succeeded = results.filter((r) => r.status === 'success').length
      const failed = results.filter((r) => r.status === 'failed').length
      return NextResponse.json({
        success: true,
        results,
        summary: { succeeded, failed, total: targets.length },
      })
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

      const primaryResults = results.filter((r) => !r.isReference)
      const refResults = results.filter((r) => r.isReference)
      const succeeded = primaryResults.filter((r) => r.status === 'success').length
      const failed = primaryResults.filter((r) => r.status === 'failed').length
      const refSucceeded = refResults.filter((r) => r.status === 'success').length
      const refFailed = refResults.filter((r) => r.status === 'failed').length

      return NextResponse.json({
        success: true,
        results,
        summary: {
          succeeded,
          failed,
          total: targets.length,
          refSucceeded,
          refFailed,
        },
        failures,
      })
    }

    return NextResponse.json({ error: 'Provide targetId, runAll, materialId, or testOnly' }, { status: 400 })
  } catch (error) {
    console.error('Scraper run error:', error)
    return NextResponse.json({ error: 'Run failed' }, { status: 500 })
  }
}
