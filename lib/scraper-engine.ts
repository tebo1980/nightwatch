/* BARATRUST UNIVERSAL SCRAPER ENGINE
Version 1.1 — March 2026

================================================
ACTIVE SOURCES
================================================

PRIMARY SOURCES (included in currentPrice average):
  Home Depot      homedepot.com         All trades
  Lowes           lowes.com             All trades
  Menards         menards.com           GC, Deck, Painter, Handyman, Concrete
  SupplyHouse     supplyhouse.com       Plumber, HVAC only
  Sherwin-Williams sherwin-williams.com  Painter only — paint and primer only

REFERENCE SOURCES (stored separately, never in average, never trigger alerts):
  Amazon          amazon.com            Handyman, small commodity
  Walmart         walmart.com           Handyman, Painter
  Target          target.com            Handyman, Painter

================================================
STORE CSS SELECTORS (confirmed working)
================================================

  Puppeteer (direct browser):
    SupplyHouse:      [class*="ProductPriceTextAmount"]
    Amazon:           .a-price-whole
    Target:           [data-test="product-price"]

  ScrapingBee (proxy bypass required):
    Home Depot:       [data-component*="price:Price"]
    Lowes:            .item-price-dollar
    Walmart:          [data-testid="price-wrap"]
    Sherwin-Williams: find selector after bypass confirmed

  Menards (Puppeteer — page loads, lazy price rendering):
    Try in sequence:  .price-big-val, [class*="price"], .price
    Requires:         3000ms wait after page load

================================================
SCRAPING METHODS
================================================
  ScrapingBee API:  HomeDepot, Lowes, Walmart, SherwinWilliams
  Puppeteer:        Amazon, Target, SupplyHouse, Menards, all others

================================================
KNOWN LIMITATIONS
================================================
  - Amazon, Target: aggressive bot detection, expect occasional failures
  - Sherwin-Williams: JavaScript-rendered prices, ScrapingBee with render_js
  - Menards: lazy-loaded prices, requires 3s wait + fallback selectors
  - Most local trade suppliers (Ferguson, ABC Supply, Wiseway, 2J Supply,
    Habegger, Rexel, Builders FirstSource) use login-based pricing and
    cannot be scraped. Handle via client intake form instead.
  - Ready-mix concrete suppliers (Advance Ready Mix, American Ready Mix,
    imi Concrete) use quote-based pricing. Not scrapeable.

================================================
PLANNED EXPANSION PATHS
================================================

GetStackCheck — Competitor Software Pricing:
  Targets: Jobber, Housecall Pro, ServiceTitan pricing pages
  Category: Software Pricing
  Frequency: Monthly
  Store in: CompetitorPricing table
  Add via: Scraper admin interface, no code changes needed

BadgerDrive — Stock Scout Phase 2:
  NOTE: Do NOT use scraper for this. Use Walmart Open API instead.
  Walmart has an official developer API with real-time store-level
  inventory data. This is more reliable and more accurate than scraping.
  Build as a dedicated BadgerDrive integration when development begins.
  Target stores: Walmart, Target, Dollar General
  Frequency: On-demand when driver receives shopping order

BaraTrust — Competitive Intelligence:
  Targets: Local Louisville agency pricing pages
  Category: Competitor
  Frequency: Monthly
  Store in: CompetitorIntel table
  Add via: Scraper admin interface

Local Supplier Monitoring — Add if public pricing found:
  Plumbers Supply Co — check for public product pages
  Wiseway Supply — check for public pricing
  2J Supply — check for public pricing
  Habegger Corporation — check for public pricing
  Builders FirstSource — check for public pricing
  True Value — reference pricing only, cooperative model
  Ace Hardware — reference pricing only, cooperative model

Paint Brands to Add When Selectors Validated:
  Benjamin Moore — benjaminmoore.com
  PPG Paint — ppgpaints.com
  Note: Add as reference sources for painter trade
  Flag in client Bolt config which brand each painter client prefers

Boot and Safety Gear — Future Consideration:
  Note: Do NOT scrape for Atlas. Handle via Cole expense tracking instead.
  Contractors log actual boot and PPE purchases in Cole.
  Cole tracks real spend per client over time.
  This is more accurate than retail reference pricing.

================================================
HOW TO ADD A NEW SOURCE
================================================
  1. Find the product page on the target site
  2. Right click the price, click Inspect in Chrome
  3. Find the price element class name or ID
  4. Use Test Selector in the Scraper admin to validate
  5. Add the selector to the STORE CSS SELECTORS section above
  6. Add targets through the Scraper admin Add Target tab
  7. No code changes needed for new sources
  8. For new use cases requiring a new target table:
     a. Add Prisma model to schema.prisma
     b. Run prisma migrate dev
     c. Update the scraper run endpoint to handle the new targetTable value
*/

import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

// ─── Store routing ────────────────────────────────────────────────
// These stores are routed through ScrapingBee API instead of Puppeteer
const SCRAPINGBEE_STORES = ['HomeDepot', 'Lowes', 'Walmart', 'SherwinWilliams']

// Menards fallback selectors — try in sequence until one works
const MENARDS_SELECTORS = ['.price-big-val', '[class*="price"]', '.price']

// ─── Store-specific configuration (for Puppeteer stores) ──────────

interface StoreConfig {
  waitTime: number
  timeout: number
  retryOnFail: boolean
  retryDelay: number
  postLoadWait: number
}

const REFERENCE_STORES = ['Amazon', 'Walmart', 'Target']

function getStoreConfig(sourceStore?: string | null): StoreConfig {
  // Menards: lazy-loaded prices need 3s wait
  if (sourceStore === 'Menards') {
    return {
      waitTime: 1000,
      timeout: 30000,
      retryOnFail: false,
      retryDelay: 0,
      postLoadWait: 3000,
    }
  }

  // Amazon, Target: aggressive bot detection (Walmart now uses ScrapingBee)
  if (sourceStore && ['Amazon', 'Target'].includes(sourceStore)) {
    return {
      waitTime: 5000,
      timeout: 45000,
      retryOnFail: true,
      retryDelay: 10000,
      postLoadWait: 2000,
    }
  }

  // SupplyHouse and all other Puppeteer stores
  return {
    waitTime: 1000,
    timeout: 30000,
    retryOnFail: false,
    retryDelay: 0,
    postLoadWait: 0,
  }
}

export function isReferenceStore(sourceStore?: string | null): boolean {
  return !!sourceStore && REFERENCE_STORES.includes(sourceStore)
}

// ─── Primary source classification ────────────────────────────────

const PRIMARY_STORES = ['HomeDepot', 'Lowes', 'Menards', 'SupplyHouse', 'SherwinWilliams']

export function isPrimaryStore(sourceStore?: string | null): boolean {
  return !!sourceStore && PRIMARY_STORES.includes(sourceStore)
}

// Store-specific price field mapping for MaterialPrice table
export function getStorePriceField(sourceStore: string): string | null {
  const map: Record<string, string> = {
    HomeDepot: 'hdPrice',
    Lowes: 'lowesPrice',
    Menards: 'menardsPrice',
    SupplyHouse: 'supplyHousePrice',
    SherwinWilliams: 'sherwinWilliamsPrice',
    Amazon: 'amazonPrice',
    Walmart: 'walmartPrice',
    Target: 'targetPrice',
  }
  return map[sourceStore] || null
}

// ─── ScrapingBee API scraper ──────────────────────────────────────

async function scrapeWithScrapingBee(url: string, selector: string): Promise<{
  success: boolean
  result?: string
  error?: string
}> {
  try {
    const apiKey = process.env.SCRAPINGBEE_API_KEY
    if (!apiKey) {
      return { success: false, error: 'ScrapingBee API key not configured' }
    }

    const params = new URLSearchParams({
      api_key: apiKey,
      url: url,
      css_selector: selector,
      render_js: 'true',
      wait: '3000',
      premium_proxy: 'true',
    })

    const response = await fetch(
      `https://app.scrapingbee.com/api/v1/?${params.toString()}`,
      {
        method: 'GET',
        signal: AbortSignal.timeout(60000),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `ScrapingBee error ${response.status}: ${errorText.slice(0, 200)}`,
      }
    }

    const text = await response.text()
    const cleaned = text.trim()

    if (!cleaned || cleaned.length === 0) {
      return { success: false, error: 'ScrapingBee returned empty response' }
    }

    return { success: true, result: cleaned }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'ScrapingBee unknown error',
    }
  }
}

// ─── Puppeteer scraper ────────────────────────────────────────────

async function scrapeWithPuppeteer(
  url: string,
  selector: string,
  sourceStore?: string | null
): Promise<{ success: boolean; result?: string; error?: string }> {
  const config = getStoreConfig(sourceStore)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browser: any = null

  async function attempt(): Promise<{ success: boolean; result?: string; error?: string }> {
    try {
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: { width: 1280, height: 720 },
        executablePath: await chromium.executablePath(),
        headless: true,
      })

      const page = await browser.newPage()

      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
      ]
      const ua = sourceStore && ['Amazon', 'Target'].includes(sourceStore)
        ? userAgents[Math.floor(Math.random() * userAgents.length)]
        : userAgents[0]

      await page.setUserAgent(ua)

      if (config.waitTime > 0) {
        await new Promise((r) => setTimeout(r, config.waitTime))
      }

      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: config.timeout,
      })

      // Post-load wait (Menards 3s for lazy prices, reference stores 2s)
      if (config.postLoadWait > 0) {
        await new Promise((r) => setTimeout(r, config.postLoadWait))
      }

      // Menards: try multiple selectors in sequence
      if (sourceStore === 'Menards') {
        const selectorsToTry = [selector, ...MENARDS_SELECTORS.filter((s) => s !== selector)]
        for (const sel of selectorsToTry) {
          try {
            await page.waitForSelector(sel, { timeout: 3000 })
            const result = await page.$eval(sel, (el: Element) => el.textContent?.trim())
            if (result && parsePrice(result) !== null) {
              return { success: true, result }
            }
          } catch {
            // Try next selector
          }
        }
        return { success: false, error: 'Menards: none of the fallback selectors found a valid price' }
      }

      // Standard single selector
      await page.waitForSelector(selector, { timeout: 10000 })
      const result = await page.$eval(selector, (el: Element) => el.textContent?.trim())

      return { success: true, result: result || '' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    } finally {
      if (browser) {
        try { await browser.close() } catch { /* ignore */ }
        browser = null
      }
    }
  }

  // First attempt
  const firstResult = await attempt()

  // Retry logic for reference stores
  if (!firstResult.success && config.retryOnFail) {
    console.log(`[Scraper] Retrying ${sourceStore} target after ${config.retryDelay}ms...`)
    await new Promise((r) => setTimeout(r, config.retryDelay))
    return attempt()
  }

  return firstResult
}

// ─── Main scraping function (routes to ScrapingBee or Puppeteer) ──

export async function scrapeTarget(
  url: string,
  selector: string,
  sourceStore?: string | null
): Promise<{
  success: boolean
  result?: string
  error?: string
}> {
  // Route ScrapingBee stores through the API
  if (sourceStore && SCRAPINGBEE_STORES.includes(sourceStore)) {
    console.log(`[Scraper] Using ScrapingBee for ${sourceStore}: ${url.slice(0, 60)}...`)
    return scrapeWithScrapingBee(url, selector)
  }

  // Everything else goes through Puppeteer
  console.log(`[Scraper] Using Puppeteer for ${sourceStore || 'unknown'}: ${url.slice(0, 60)}...`)
  return scrapeWithPuppeteer(url, selector, sourceStore)
}

// ─── Price parsing utility ─────────────────────────────────────────
// Handles: $3.09, 3.09, $3.09/each, 3.09/ft, $1,234.56, 1234.56

export function parsePrice(rawText: string): number | null {
  if (!rawText) return null
  // Strip everything before and including the last $ (handles "$3.09" and "Was $5.00 Now $3.09")
  let text = rawText
  const lastDollar = text.lastIndexOf('$')
  if (lastDollar !== -1) {
    text = text.slice(lastDollar + 1)
  }
  // Remove commas (for 1,234.56)
  text = text.replace(/,/g, '')
  // Stop at first non-numeric/non-dot character after the number starts (handles /each, /ft, etc.)
  const match = text.match(/(\d+\.?\d*)/)
  if (!match) return null
  const parsed = parseFloat(match[1])
  return isNaN(parsed) ? null : parsed
}

// ─── Price looks valid check (for test selector UI) ────────────────

export function looksLikePrice(rawText: string): {
  isPrice: boolean
  warning?: string
} {
  if (!rawText || rawText.trim().length === 0) {
    return { isPrice: false, warning: 'Empty result' }
  }
  if (rawText.length > 30) {
    return { isPrice: false, warning: 'Result is longer than 30 characters — may not be a price element' }
  }
  const price = parsePrice(rawText)
  if (price === null) {
    return { isPrice: false, warning: 'Result contains letters or does not look like a number' }
  }
  return { isPrice: true }
}

// ─── Multi-source price recalculation ──────────────────────────────

export function recalculatePrices(material: {
  hdPrice: number | null
  lowesPrice: number | null
  menardsPrice: number | null
  supplyHousePrice: number | null
  sherwinWilliamsPrice: number | null
}): {
  currentPrice: number | null
  lowPrice: number | null
  highPrice: number | null
} {
  const primaryPrices = [
    material.hdPrice,
    material.lowesPrice,
    material.menardsPrice,
    material.supplyHousePrice,
    material.sherwinWilliamsPrice,
  ].filter((p): p is number => p !== null && p > 0)

  if (primaryPrices.length === 0) {
    return { currentPrice: null, lowPrice: null, highPrice: null }
  }

  const sum = primaryPrices.reduce((a, b) => a + b, 0)
  return {
    currentPrice: Math.round((sum / primaryPrices.length) * 100) / 100,
    lowPrice: Math.min(...primaryPrices),
    highPrice: Math.max(...primaryPrices),
  }
}
