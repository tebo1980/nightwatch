import { NextRequest, NextResponse } from 'next/server'
import { scrapeTarget, parsePrice, looksLikePrice } from '@/lib/scraper-engine'

export async function POST(req: NextRequest) {
  try {
    const { url, selector, sourceStore } = await req.json()

    if (!url || !selector) {
      return NextResponse.json({ error: 'URL and selector are required' }, { status: 400 })
    }

    const result = await scrapeTarget(url, selector, sourceStore || null)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        found: false,
        error: result.error,
        status: 'error',
      })
    }

    const rawText = result.result || ''
    const price = parsePrice(rawText)
    const priceCheck = looksLikePrice(rawText)

    let status: 'found' | 'warning' | 'not_found' = 'found'
    if (!rawText) {
      status = 'not_found'
    } else if (!priceCheck.isPrice) {
      status = 'warning'
    }

    return NextResponse.json({
      success: true,
      found: !!rawText,
      result: rawText,
      price,
      status,
      warning: priceCheck.warning || null,
    })
  } catch (error) {
    console.error('Scraper test error:', error)
    return NextResponse.json({ error: 'Test failed' }, { status: 500 })
  }
}
