/**
 * Bolt E2E Test — Complete flow from config creation to approval.
 * Run with: NEXT_PUBLIC_APP_URL=http://localhost:3103 npx tsx scripts/test-bolt-e2e.ts
 */

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const APP = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3103'

function pass(step: string, detail: string) { console.log(`  ✓ ${step}: ${detail}`) }
function fail(step: string, detail: string) { console.log(`  ✗ ${step}: ${detail}`) }

async function main() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('  BOLT E2E TEST')
  console.log('═══════════════════════════════════════════════════════\n')

  // ─── Step 1: Create test client + bolt config ──────────────────
  console.log('Step 1: Create test client and Bolt config')

  let testClient = await prisma.agentClient.findFirst({ where: { businessName: 'Advanced Plumbing Solutions' } })
  if (!testClient) {
    testClient = await prisma.agentClient.create({
      data: {
        businessName: 'Advanced Plumbing Solutions', industry: 'Plumbing', ownerName: 'Test E2E',
        ownerFirstName: 'Test', ownerEmail: 'test-e2e@baratrust.com', contactPhone: '502-555-9999',
        city: 'Louisville', state: 'KY', servicesOffered: 'Plumbing',
      },
    })
  }

  let boltConfig = await prisma.clientBoltConfig.findUnique({ where: { clientSlug: 'advanced-plumbing' } })
  if (!boltConfig) {
    boltConfig = await prisma.clientBoltConfig.create({
      data: {
        clientId: testClient.id, clientSlug: 'advanced-plumbing', businessName: 'Advanced Plumbing Solutions',
        businessPhone: '502-555-9999', businessEmail: 'test-e2e@baratrust.com', trade: 'Plumber',
        laborRatePerHour: 85, taxRate: 6, escalationClause: true,
      },
    })
  }
  pass('Config', `Created: ${boltConfig.businessName} at /bolt/advanced-plumbing`)

  // ─── Step 2: Verify mobile page loads ──────────────────────────
  console.log('\nStep 2: Verify /bolt/advanced-plumbing loads')
  const pageRes = await fetch(`${APP}/bolt/advanced-plumbing`)
  if (pageRes.ok) pass('Page', `HTTP ${pageRes.status}`)
  else fail('Page', `HTTP ${pageRes.status}`)

  // ─── Step 3: Create estimate via API (simulating steps 1-4) ────
  console.log('\nStep 3: Create estimate')
  const estRes = await fetch(`${APP}/api/bolt/estimates`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: testClient.id, customerName: 'Sarah Johnson', customerPhone: '502-555-0101',
      customerEmail: 'sarah@test.com', customerAddress: '456 Oak Street, Louisville, KY',
      jobType: 'Water Heater Replacement',
      jobDescription: 'Replace existing 40 gallon gas water heater, update connections to current code',
      lineItems: [
        { name: '40-Gallon Gas Water Heater', unit: 'each', unitPrice: 599, quantity: 1, total: 599 },
        { name: '1/4 Turn Angle Stop Valve 1/2 x 3/8', unit: 'each', unitPrice: 8.98, quantity: 1, total: 8.98 },
        { name: '3/4 in. PEX-B Pipe (100 ft Red)', unit: 'roll', unitPrice: 42.98, quantity: 1, total: 42.98 },
      ],
      laborHours: 3, laborRate: 85, laborTotal: 255,
      materialsTotal: 650.96, subtotal: 905.96, taxAmount: 54.36, totalAmount: 960.32, depositRequired: 480.16,
    }),
  })
  const estData = await estRes.json()
  if (estData.estimate) {
    pass('Estimate', `Created: ${estData.estimate.estimateNumber} — $${estData.estimate.totalAmount}`)
  } else { fail('Estimate', JSON.stringify(estData)); return }

  const estimateId = estData.estimate.id

  // ─── Step 4: Generate PDF ──────────────────────────────────────
  console.log('\nStep 4: Generate PDF')
  const pdfRes = await fetch(`${APP}/api/bolt/generate-pdf`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estimateId }),
  })
  const pdfData = await pdfRes.json()
  if (pdfData.pdfUrl) {
    pass('PDF', `URL: ${pdfData.pdfUrl}`)
    // Verify PDF is accessible
    const pdfCheck = await fetch(pdfData.pdfUrl)
    if (pdfCheck.ok) pass('PDF Access', `HTTP ${pdfCheck.status} — ${pdfCheck.headers.get('content-type')}`)
    else fail('PDF Access', `HTTP ${pdfCheck.status}`)
  } else { fail('PDF', pdfData.error || 'No URL returned') }

  // ─── Step 5: Send estimate via SMS ─────────────────────────────
  console.log('\nStep 5: Send estimate')
  const sendRes = await fetch(`${APP}/api/bolt/send`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estimateId, sendMethod: 'both' }),
  })
  const sendData = await sendRes.json()
  if (sendData.success) {
    pass('Send', `Success — SMS: ${sendData.sent?.sms ?? 'n/a'}, Email: ${sendData.sent?.email ?? 'n/a'}`)
    if (sendData.errors?.length) console.log(`    (Errors: ${sendData.errors.join('; ')})`)
  } else { fail('Send', sendData.error || 'Failed') }

  // Verify status updated
  const sentEst = await prisma.estimate.findUnique({ where: { id: estimateId } })
  if (sentEst?.status === 'sent') pass('Status', 'Updated to "sent"')
  else fail('Status', `Expected "sent", got "${sentEst?.status}"`)

  // ─── Step 6: Load approval page ────────────────────────────────
  console.log('\nStep 6: Approval page')
  const approvePageRes = await fetch(`${APP}/bolt/approve/${estimateId}`)
  if (approvePageRes.ok) pass('Approval Page', `HTTP ${approvePageRes.status}`)
  else fail('Approval Page', `HTTP ${approvePageRes.status}`)

  // ─── Step 7: Approve estimate ──────────────────────────────────
  console.log('\nStep 7: Approve estimate')
  const approveRes = await fetch(`${APP}/api/bolt/approve`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estimateId, action: 'approve' }),
  })
  const approveData = await approveRes.json()
  if (approveData.success) pass('Approve', `Status: ${approveData.status}`)
  else fail('Approve', approveData.error || 'Failed')

  // Verify final state
  const finalEst = await prisma.estimate.findUnique({ where: { id: estimateId } })
  if (finalEst?.status === 'approved') pass('Final Status', 'Updated to "approved"')
  else fail('Final Status', `Expected "approved", got "${finalEst?.status}"`)
  if (finalEst?.approvedAt) pass('Approved Date', finalEst.approvedAt.toISOString())
  else fail('Approved Date', 'Not set')

  // ─── Step 8: Verify admin view data ────────────────────────────
  console.log('\nStep 8: Admin view verification')
  const configRes = await fetch(`${APP}/api/bolt/config`)
  const configData = await configRes.json()
  const apConfig = (configData.configs || []).find((c: { clientSlug: string }) => c.clientSlug === 'advanced-plumbing')
  if (apConfig) pass('Admin Config', `Found: ${apConfig.businessName} — ${apConfig.estimateCount} estimates`)
  else fail('Admin Config', 'Not found')

  const estsRes = await fetch(`${APP}/api/bolt/estimates?clientSlug=advanced-plumbing`)
  const estsData = await estsRes.json()
  const approved = (estsData.estimates || []).filter((e: { status: string }) => e.status === 'approved')
  pass('Admin Estimates', `${estsData.estimates?.length || 0} total, ${approved.length} approved`)

  console.log('\n═══════════════════════════════════════════════════════')
  console.log('  E2E TEST COMPLETE')
  console.log('═══════════════════════════════════════════════════════\n')
}

main().catch(console.error).finally(() => prisma.$disconnect())
