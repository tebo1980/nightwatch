/**
 * Quick test: scrape one target from each active store.
 * Uses confirmed URLs to validate selectors work.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Use confirmed working URLs for each store
const TESTS = [
  {
    store: 'SupplyHouse',
    name: 'Wax Ring (confirmed URL)',
    url: 'https://www.supplyhouse.com/Fluidmaster-7516-Toilet-Wax-Ring-w-Flange',
    selector: '[class*="ProductPriceTextAmount"]',
  },
  {
    store: 'Amazon',
    name: 'Drywall Patch Kit',
    url: 'https://www.amazon.com/dp/B000BQMFEC',
    selector: '.a-price-whole',
  },
  {
    store: 'Target',
    name: 'Scotch Blue Painters Tape',
    url: 'https://www.target.com/p/scotchblue-original-multi-surface-painter-s-tape/-/A-13363368',
    selector: '[data-test="product-price"]',
  },
]

async function main() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('  SCRAPER STORE TEST — Confirmed URLs')
  console.log('═══════════════════════════════════════════════════════\n')

  const results: { store: string; status: string; price?: string; error?: string }[] = []

  for (const test of TESTS) {
    console.log(`  Testing ${test.store}: ${test.name}`)
    console.log(`    URL: ${test.url}`)

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nightwatch.baratrust.com'
      const response = await fetch(`${appUrl}/api/scraper/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testOnly: true,
          url: test.url,
          selector: test.selector,
        }),
      })

      const data = await response.json()
      if (data.success && data.price !== null && data.price > 0) {
        console.log(`    ✓ Result: ${data.result}`)
        console.log(`    ✓ Price:  $${data.price}`)
        results.push({ store: test.store, status: 'PASS', price: `$${data.price}` })
      } else if (data.success) {
        console.log(`    ~ Result: ${data.result} (price parse: ${data.price})`)
        results.push({ store: test.store, status: 'PARTIAL', price: `raw: ${data.result}` })
      } else {
        console.log(`    ✗ Failed: ${data.error}`)
        results.push({ store: test.store, status: 'FAIL', error: data.error })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`    ✗ Error: ${msg}`)
      results.push({ store: test.store, status: 'ERROR', error: msg })
    }

    console.log('')
  }

  console.log('═══════════════════════════════════════════════════════')
  console.log('  TEST RESULTS')
  console.log('═══════════════════════════════════════════════════════')
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✓' : r.status === 'PARTIAL' ? '~' : '✗'
    const detail = r.price || r.error || ''
    console.log(`  ${icon} ${r.store}: ${r.status} — ${detail}`)
  }
  console.log('═══════════════════════════════════════════════════════\n')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
