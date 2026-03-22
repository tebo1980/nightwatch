/**
 * Seed ScraperTarget records from MaterialPrice records with multi-source support.
 *
 * Run after Atlas seed is complete:
 *   npx tsx scripts/seed-scraper-targets.ts
 *
 * Creates ScraperTargets for each MaterialPrice across all applicable stores.
 * Each trade gets different stores based on the classification rules:
 *
 * PRIMARY (included in currentPrice average):
 *   Home Depot      — all trades
 *   Lowes           — all trades
 *   Menards         — GC, Deck Builder, Painter, Handyman, Concrete
 *   SupplyHouse     — Plumber, HVAC only
 *   Sherwin-Williams— Painter only (paint and primer only)
 *
 * REFERENCE (stored separately, never in average, never trigger alerts):
 *   Amazon          — Handyman, small commodity
 *   Walmart         — Handyman, Painter
 *   Target          — Handyman, Painter
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── Store configuration ──────────────────────────────────────

interface StoreConfig {
  name: string
  domain: string
  selector: string
  isPrimary: boolean
  isReference: boolean
  applicableTrades: string[] | 'all'
  // For stores like SW that only apply to certain material types
  materialFilter?: (materialName: string) => boolean
}

const STORES: StoreConfig[] = [
  {
    name: 'HomeDepot',
    domain: 'homedepot.com',
    selector: '.price-format__main-price',
    isPrimary: true,
    isReference: false,
    applicableTrades: 'all',
  },
  {
    name: 'Lowes',
    domain: 'lowes.com',
    selector: '[data-selector="price"]',
    isPrimary: true,
    isReference: false,
    applicableTrades: 'all',
  },
  {
    name: 'Menards',
    domain: 'menards.com',
    selector: '.price-label',
    isPrimary: true,
    isReference: false,
    applicableTrades: ['General Contractor', 'Deck Builder', 'Painter', 'Handyman', 'Concrete'],
  },
  {
    name: 'SupplyHouse',
    domain: 'supplyhouse.com',
    selector: '.price',
    isPrimary: true,
    isReference: false,
    applicableTrades: ['Plumber', 'HVAC'],
  },
  {
    name: 'SherwinWilliams',
    domain: 'sherwin-williams.com',
    selector: '.price',
    isPrimary: true,
    isReference: false,
    applicableTrades: ['Painter'],
    // Only paint and primer, not sundries like tape/rollers
    materialFilter: (name: string) => {
      const lower = name.toLowerCase()
      return lower.includes('paint') || lower.includes('primer') || lower.includes('stain')
    },
  },
  {
    name: 'Amazon',
    domain: 'amazon.com',
    selector: '.a-price-whole',
    isPrimary: false,
    isReference: true,
    applicableTrades: ['Handyman'],
  },
  {
    name: 'Walmart',
    domain: 'walmart.com',
    selector: '[data-automation-id="product-price"] span',
    isPrimary: false,
    isReference: true,
    applicableTrades: ['Handyman', 'Painter'],
  },
  {
    name: 'Target',
    domain: 'target.com',
    selector: '[data-test="product-price"]',
    isPrimary: false,
    isReference: true,
    applicableTrades: ['Handyman', 'Painter'],
  },
]

function isStoreApplicable(store: StoreConfig, trade: string, materialName: string): boolean {
  // Check trade applicability
  if (store.applicableTrades !== 'all' && !store.applicableTrades.includes(trade)) {
    return false
  }
  // Check material filter (e.g., SW only for paint/primer)
  if (store.materialFilter && !store.materialFilter(materialName)) {
    return false
  }
  return true
}

// ─── Main seed function ──────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('  BARATRUST SCRAPER TARGET SEED — Multi-Source')
  console.log('═══════════════════════════════════════════════════════\n')

  try {
    const materials = await prisma.materialPrice.findMany({
      orderBy: [{ trade: 'asc' }, { name: 'asc' }],
    })

    if (materials.length === 0) {
      console.log('No MaterialPrice records found. Run the Atlas seed first.')
      return
    }

    console.log(`Found ${materials.length} materials.\n`)

    // Tracking
    const storeCounts: Record<string, number> = {}
    const tradeCounts: Record<string, number> = {}
    let created = 0
    let skipped = 0

    for (const mat of materials) {
      for (const store of STORES) {
        if (!isStoreApplicable(store, mat.trade, mat.name)) continue

        // Check if target already exists for this material + store
        const existing = await prisma.scraperTarget.findFirst({
          where: {
            targetTable: 'MaterialPrice',
            targetRecordId: mat.id,
            sourceStore: store.name,
          },
        })

        if (existing) {
          skipped++
          continue
        }

        // Build a search URL (placeholder — actual URLs would come from product matching)
        const searchUrl = mat.sourceUrl && mat.sourceUrl.includes(store.domain)
          ? mat.sourceUrl
          : `https://www.${store.domain}/search?q=${encodeURIComponent(mat.name)}`

        await prisma.scraperTarget.create({
          data: {
            name: `${mat.name} — ${store.name}`,
            category: 'Materials',
            url: mat.sourceUrl && mat.sourceUrl.includes(store.domain) ? mat.sourceUrl : searchUrl,
            priceSelector: store.selector,
            targetTable: 'MaterialPrice',
            targetField: 'currentPrice',
            targetRecordId: mat.id,
            frequency: 'weekly',
            isActive: true,
            sourceStore: store.name,
            isPrimary: store.isPrimary,
            isReference: store.isReference,
          },
        })

        storeCounts[store.name] = (storeCounts[store.name] || 0) + 1
        tradeCounts[mat.trade] = (tradeCounts[mat.trade] || 0) + 1
        created++
      }
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════')
    console.log('  SEED SUMMARY')
    console.log('═══════════════════════════════════════════════════════')
    console.log(`  Total created: ${created}`)
    console.log(`  Skipped (existing): ${skipped}\n`)

    console.log('  By Store:')
    for (const [store, count] of Object.entries(storeCounts).sort()) {
      const storeConf = STORES.find((s) => s.name === store)
      const label = storeConf?.isReference ? ' (Reference)' : ' (Primary)'
      console.log(`    ${store}: ${count} targets${label}`)
    }

    console.log('\n  By Trade:')
    for (const [trade, count] of Object.entries(tradeCounts).sort()) {
      console.log(`    ${trade}: ${count} targets`)
    }

    console.log('\n═══════════════════════════════════════════════════════\n')
  } catch (error) {
    if (String(error).includes('does not exist') || String(error).includes('materialPrice')) {
      console.log('MaterialPrice table does not exist yet.')
      console.log('Run this script after Atlas has been built and the migration applied.')
    } else {
      console.error('Error:', error)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main()
