/**
 * Test Bolt PDF generation with realistic plumber data.
 * Creates an estimate and generates a PDF.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find the test-plumber config
  const config = await prisma.clientBoltConfig.findUnique({
    where: { clientSlug: 'test-plumber' },
  })

  if (!config) {
    console.error('No test-plumber config found. Run seed-bolt-test.ts first.')
    return
  }

  console.log('Found test config:', config.businessName)

  // Create test estimate
  const lineItems = [
    { name: '40-Gallon Gas Water Heater', unit: 'each', unitPrice: 650.00, quantity: 1, total: 650.00 },
    { name: 'PEX Fittings', unit: 'each', unitPrice: 3.50, quantity: 4, total: 14.00 },
    { name: 'Shut-off Valve', unit: 'each', unitPrice: 12.00, quantity: 1, total: 12.00 },
    { name: 'Pipe Dope', unit: 'each', unitPrice: 8.00, quantity: 1, total: 8.00 },
  ]

  const laborHours = 3
  const laborRate = 75
  const laborTotal = laborHours * laborRate
  const materialsTotal = lineItems.reduce((s, i) => s + i.total, 0)
  const subtotal = laborTotal + materialsTotal
  const taxAmount = subtotal * (config.taxRate / 100)
  const totalAmount = subtotal + taxAmount
  const depositRequired = Math.round(totalAmount * 50) / 100

  const estimate = await prisma.estimate.create({
    data: {
      clientId: config.clientId,
      estimateNumber: `BT-TP-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-99`,
      customerName: 'Test Customer',
      customerPhone: '502-555-0100',
      customerEmail: 'test@example.com',
      customerAddress: '123 Main St, New Albany, IN 47150',
      jobType: 'Water Heater Replacement',
      jobDescription: 'Replace 40 gallon gas water heater. Remove old unit, install new Rheem gas water heater, connect gas and water lines, test for leaks.',
      lineItems,
      laborHours,
      laborRate,
      laborTotal,
      materialsTotal,
      subtotal,
      taxAmount,
      totalAmount,
      depositRequired,
      validUntil: new Date(Date.now() + config.validityDays * 86400000),
    },
  })

  console.log('Created test estimate:', estimate.estimateNumber)
  console.log(`  Customer: ${estimate.customerName}`)
  console.log(`  Total: $${totalAmount.toFixed(2)}`)
  console.log(`  ID: ${estimate.id}`)

  // Call the generate-pdf endpoint
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nightwatch.baratrust.com'
  console.log(`\nCalling ${appUrl}/api/bolt/generate-pdf...`)

  try {
    const res = await fetch(`${appUrl}/api/bolt/generate-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estimateId: estimate.id }),
    })

    const data = await res.json()

    if (data.success && data.pdfUrl) {
      console.log('\n✓ PDF generated successfully!')
      console.log(`  PDF URL: ${data.pdfUrl}`)
    } else {
      console.log('\n✗ PDF generation failed:')
      console.log(`  Error: ${data.error || JSON.stringify(data)}`)
    }
  } catch (err) {
    console.error('\n✗ Request failed:', err)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
