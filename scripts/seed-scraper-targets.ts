/**
 * Seed ScraperTarget records from MaterialPrice records that have a sourceUrl.
 *
 * Run after Atlas seed is complete:
 *   npx tsx scripts/seed-scraper-targets.ts
 *
 * Prerequisites:
 *   - MaterialPrice model must exist in prisma/schema.prisma
 *   - Atlas seed must have populated MaterialPrice records with sourceUrl values
 *   - Run `npx prisma generate` if schema has changed
 *
 * This script creates a ScraperTarget for each MaterialPrice that has a sourceUrl,
 * pointing back to the MaterialPrice table so the weekly cron can auto-update prices.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Default CSS selectors for known retailers
function guessSelector(url: string): string {
  if (url.includes('homedepot.com')) return '.price-format__main-price'
  if (url.includes('lowes.com')) return '.main-price'
  if (url.includes('menards.com')) return '.price-label'
  if (url.includes('amazon.com')) return '.a-price-whole'
  return '.price' // generic fallback
}

function guessCategory(url: string): string {
  if (url.includes('homedepot.com') || url.includes('lowes.com') || url.includes('menards.com')) return 'Materials'
  return 'Other'
}

async function main() {
  console.log('Seeding ScraperTargets from MaterialPrice records...\n')

  // Check if MaterialPrice table exists
  try {
    // @ts-expect-error — MaterialPrice may not exist in generated client yet
    const materials = await prisma.materialPrice.findMany({
      where: {
        sourceUrl: { not: null },
      },
    })

    if (materials.length === 0) {
      console.log('No MaterialPrice records with sourceUrl found. Nothing to seed.')
      return
    }

    console.log(`Found ${materials.length} MaterialPrice records with sourceUrl.\n`)

    let created = 0
    let skipped = 0

    for (const mat of materials) {
      if (!mat.sourceUrl) continue

      // Check if a ScraperTarget already exists for this record
      const existing = await prisma.scraperTarget.findFirst({
        where: {
          targetTable: 'MaterialPrice',
          targetRecordId: mat.id,
        },
      })

      if (existing) {
        console.log(`  SKIP: ${mat.name || mat.id} — target already exists`)
        skipped++
        continue
      }

      const selector = guessSelector(mat.sourceUrl)
      const category = guessCategory(mat.sourceUrl)

      await prisma.scraperTarget.create({
        data: {
          name: mat.name || `Material ${mat.id}`,
          category,
          url: mat.sourceUrl,
          priceSelector: selector,
          targetTable: 'MaterialPrice',
          targetField: 'currentPrice',
          targetRecordId: mat.id,
          frequency: 'weekly',
          isActive: true,
        },
      })

      console.log(`  CREATED: ${mat.name || mat.id} → ${selector}`)
      created++
    }

    console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`)
  } catch (error) {
    if (String(error).includes('does not exist') || String(error).includes('materialPrice')) {
      console.log('MaterialPrice table does not exist yet.')
      console.log('Run this script after Atlas (Step 9) has been built and seeded.')
    } else {
      console.error('Error:', error)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main()
