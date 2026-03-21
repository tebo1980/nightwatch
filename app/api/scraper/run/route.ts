import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

async function scrapeTarget(target: { id: string; url: string; priceSelector: string; targetTable: string; targetField: string; targetRecordId: string }) {
  try {
    // Fetch the page HTML
    const res = await fetch(target.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()

    // Extract using a simple regex-based approach for CSS selectors
    // Supports: .class, #id, [attr], tag selectors
    let result: string | null = null
    const selector = target.priceSelector.trim()

    if (selector.startsWith('.')) {
      // Class selector
      const className = selector.slice(1).replace(/\./g, '\\s+')
      const regex = new RegExp(`class="[^"]*${className}[^"]*"[^>]*>([^<]+)`, 'i')
      const match = html.match(regex)
      if (match) result = match[1].trim()
    } else if (selector.startsWith('#')) {
      // ID selector
      const id = selector.slice(1)
      const regex = new RegExp(`id="${id}"[^>]*>([^<]+)`, 'i')
      const match = html.match(regex)
      if (match) result = match[1].trim()
    } else if (selector.startsWith('[')) {
      // Attribute selector e.g. [data-price]
      const attr = selector.slice(1, -1)
      const regex = new RegExp(`${attr}="([^"]+)"`, 'i')
      const match = html.match(regex)
      if (match) result = match[1].trim()
    } else {
      // Tag selector or complex — try to match tag content
      const regex = new RegExp(`<${selector}[^>]*>([^<]+)</${selector}>`, 'i')
      const match = html.match(regex)
      if (match) result = match[1].trim()
    }

    if (!result) throw new Error('Selector matched no content')

    // Log success
    await prisma.scraperLog.create({
      data: { targetId: target.id, result, status: 'success' },
    })
    await prisma.scraperTarget.update({
      where: { id: target.id },
      data: { lastScraped: new Date(), lastResult: result, lastStatus: 'success' },
    })

    return { id: target.id, status: 'success', result }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    await prisma.scraperLog.create({
      data: { targetId: target.id, status: 'failed', errorMsg },
    })
    await prisma.scraperTarget.update({
      where: { id: target.id },
      data: { lastScraped: new Date(), lastStatus: 'failed' },
    })
    return { id: target.id, status: 'failed', error: errorMsg }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { targetId, runAll, testOnly, url, selector } = body

    // Test mode — scrape without saving
    if (testOnly && url && selector) {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        })
        if (!res.ok) return NextResponse.json({ success: false, error: `HTTP ${res.status}` })
        const html = await res.text()

        let result: string | null = null
        const sel = selector.trim()

        if (sel.startsWith('.')) {
          const className = sel.slice(1).replace(/\./g, '\\s+')
          const regex = new RegExp(`class="[^"]*${className}[^"]*"[^>]*>([^<]+)`, 'i')
          const match = html.match(regex)
          if (match) result = match[1].trim()
        } else if (sel.startsWith('#')) {
          const id = sel.slice(1)
          const regex = new RegExp(`id="${id}"[^>]*>([^<]+)`, 'i')
          const match = html.match(regex)
          if (match) result = match[1].trim()
        } else if (sel.startsWith('[')) {
          const attr = sel.slice(1, -1)
          const regex = new RegExp(`${attr}="([^"]+)"`, 'i')
          const match = html.match(regex)
          if (match) result = match[1].trim()
        } else {
          const regex = new RegExp(`<${sel}[^>]*>([^<]+)</${sel}>`, 'i')
          const match = html.match(regex)
          if (match) result = match[1].trim()
        }

        return NextResponse.json({ success: true, result: result || null, found: !!result })
      } catch (error) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) })
      }
    }

    // Run single target
    if (targetId) {
      const target = await prisma.scraperTarget.findUnique({ where: { id: targetId } })
      if (!target) return NextResponse.json({ error: 'Target not found' }, { status: 404 })
      const result = await scrapeTarget(target)
      return NextResponse.json({ success: true, results: [result] })
    }

    // Run all active targets
    if (runAll) {
      const targets = await prisma.scraperTarget.findMany({ where: { isActive: true } })
      const results = []
      for (const target of targets) {
        results.push(await scrapeTarget(target))
      }
      const succeeded = results.filter((r) => r.status === 'success').length
      const failed = results.filter((r) => r.status === 'failed').length
      return NextResponse.json({ success: true, results, summary: { succeeded, failed, total: targets.length } })
    }

    return NextResponse.json({ error: 'Provide targetId, runAll, or testOnly' }, { status: 400 })
  } catch (error) {
    console.error('Scraper run error:', error)
    return NextResponse.json({ error: 'Run failed' }, { status: 500 })
  }
}
