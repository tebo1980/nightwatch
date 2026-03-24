/**
 * Memoria E2E Test Script
 *
 * Tests the full Memoria flow:
 * 1. Find a test client
 * 2. Submit invoice/revenue data through the intake API
 * 3. Submit ad spend data through the intake API
 * 4. Verify insights were created
 * 5. Generate intelligence report
 * 6. Display results
 *
 * Run: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-memoria-e2e.ts
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

async function main() {
  console.log('\n🧠 MEMORIA E2E TEST\n')
  console.log('=' .repeat(60))

  // Step 1: Find a test client
  console.log('\n📋 Step 1: Finding test client...')
  const clientsRes = await fetch(`${BASE_URL}/api/agent-clients`)
  const clientsData = await clientsRes.json()
  const clients = clientsData.clients || []

  if (clients.length === 0) {
    console.log('❌ No clients found. Create a client first via /onboarding')
    process.exit(1)
  }

  const testClient = clients[0]
  console.log(`   Using: ${testClient.businessName} (${testClient.industry}) — ID: ${testClient.id}`)

  // Step 2: Submit 6 months of plumber invoice data
  console.log('\n📥 Step 2: Submitting 6 months of invoice/revenue data...')
  const invoiceData = `Date,Customer,Job Type,Amount,Payment Date,Notes
2025-10-05,Johnson Family,Water heater replacement,$2850,2025-10-12,50-gallon gas tank install
2025-10-11,Riverside Apartments,Kitchen drain repair,$425,2025-10-11,Paid same day cash
2025-10-18,Mark Thompson,Sewer line camera inspection,$350,2025-10-25,Found root intrusion
2025-10-22,Riverside Apartments,Bathroom rough-in,$3200,2025-11-15,Slow payer - 24 days
2025-11-02,Sarah Mitchell,Tankless water heater,$4100,2025-11-05,Navien NPE-240A
2025-11-08,Johnson Family,Whole house repipe,$8500,2025-11-22,PEX repipe - copper to PEX
2025-11-15,Oak Grove Church,Backflow preventer install,$1200,2025-11-15,Annual certification
2025-11-20,David Chen,Garbage disposal + faucet,$650,2025-11-20,Paid on completion
2025-12-03,Sarah Mitchell,Gas line extension,$1800,2025-12-10,For new outdoor kitchen
2025-12-12,Riverside Apartments,Water main repair,$5400,2026-01-18,37 days to payment
2025-12-18,Holiday Inn Express,Commercial water heater,$6200,2025-12-30,Warranty replacement
2025-12-28,Mark Thompson,Sewer line repair,$4800,2026-01-10,Trenchless repair
2026-01-05,Johnson Family,Bathroom remodel plumbing,$3800,2026-01-12,Master bath upgrade
2026-01-14,New client - Williams,Emergency pipe burst,$2200,2026-01-14,After hours call - Saturday
2026-01-22,David Chen,Water softener install,$1950,2026-01-28,Fleck 5600SXT
2026-02-01,Riverside Apartments,Unit 4B complete repipe,$4600,2026-03-05,32 days to payment AGAIN
2026-02-10,Sarah Mitchell,Sump pump replacement,$1100,2026-02-15,Battery backup added
2026-02-18,Oak Grove Church,Water heater maintenance,$350,2026-02-18,Annual flush
2026-02-25,Holiday Inn Express,Grease trap service,$800,2026-03-01,Quarterly contract
2026-03-05,Johnson Family,Outdoor hose bibs,$450,2026-03-05,Freeze damage repair
2026-03-12,New client - Williams,Kitchen remodel plumbing,$5200,2026-03-20,Full kitchen gut job
2026-03-18,Mark Thompson,Water heater replacement,$3100,2026-03-22,Upgraded to hybrid heat pump`

  const invoiceRes = await fetch(`${BASE_URL}/api/memoria/intake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: testClient.id,
      dataType: 'invoices',
      periodStart: '2025-10-01',
      periodEnd: '2026-03-24',
      rawData: invoiceData,
    }),
  })
  const invoiceResult = await invoiceRes.json()
  console.log(`   ✅ Invoice data processed: ${invoiceResult.insightsCreated || 0} insights, ${invoiceResult.dataPoints || 0} data points`)
  if (invoiceResult.categories) {
    console.log(`   Categories: ${invoiceResult.categories.join(', ')}`)
  }
  if (invoiceResult.error) {
    console.log(`   ⚠️ Error: ${invoiceResult.error}`)
  }

  // Step 3: Submit 6 months of ad spend data
  console.log('\n📥 Step 3: Submitting 6 months of ad spend data...')
  const adSpendData = `Month,Facebook Spend,Google Ads Spend,Total Leads,Booked Jobs,Notes
October 2025,$450,$600,18,8,Started Google Ads campaign
November 2025,$450,$600,22,11,Google Ads performing well - water heater keywords
December 2025,$500,$700,15,9,Holiday slowdown but emergency calls up
January 2026,$500,$750,28,14,January spike - freeze damage drove emergency calls
February 2026,$400,$750,20,10,Reduced Facebook - Google converting better
March 2026,$350,$800,25,13,Shifted budget to Google - cost per lead dropped from $58 to $44

Summary observations:
- Google Ads cost per lead: $44 average (down from $58 in October)
- Facebook cost per lead: $72 average (rising)
- Best performing keywords: "emergency plumber Louisville", "water heater replacement near me"
- Worst performing: Facebook brand awareness campaign ($200/mo with 0 leads)
- Lead to job conversion rate: 52% overall
- January was best month - freeze-related emergencies
- Repeat clients (Johnson, Mitchell, Riverside) account for 40% of revenue but $0 ad spend
- New client acquisition cost: approximately $88 per new customer`

  const adRes = await fetch(`${BASE_URL}/api/memoria/intake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: testClient.id,
      dataType: 'ad_spend',
      periodStart: '2025-10-01',
      periodEnd: '2026-03-24',
      rawData: adSpendData,
    }),
  })
  const adResult = await adRes.json()
  console.log(`   ✅ Ad spend data processed: ${adResult.insightsCreated || 0} insights, ${adResult.dataPoints || 0} data points`)
  if (adResult.categories) {
    console.log(`   Categories: ${adResult.categories.join(', ')}`)
  }

  // Step 4: Verify insights exist in the database
  console.log('\n🔍 Step 4: Verifying insights in database...')
  const insightsRes = await fetch(`${BASE_URL}/api/memoria/insights?clientId=${testClient.id}`)
  const insightsData = await insightsRes.json()
  const insights = insightsData.insights || []
  console.log(`   Total active insights: ${insights.length}`)

  // Group by category
  const byCategory: Record<string, number> = {}
  for (const ins of insights) {
    byCategory[ins.category] = (byCategory[ins.category] || 0) + 1
  }
  console.log('   By category:')
  for (const [cat, count] of Object.entries(byCategory)) {
    console.log(`     ${cat}: ${count}`)
  }

  // Step 5: Display insights
  console.log('\n📊 Step 5: Intelligence profile:')
  for (const ins of insights) {
    console.log(`   [${ins.confidence.toUpperCase()}] (${ins.dataPoints} pts) ${ins.category}: ${ins.insight.substring(0, 100)}...`)
  }

  // Step 6: Generate intelligence report
  console.log('\n📋 Step 6: Generating Memoria Intelligence Brief...')
  const reportRes = await fetch(`${BASE_URL}/api/memoria/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: testClient.id }),
  })
  const reportData = await reportRes.json()

  if (reportData.brief) {
    console.log('\n' + '═'.repeat(60))
    console.log('🧠 MEMORIA INTELLIGENCE BRIEF')
    console.log('═'.repeat(60))
    console.log(reportData.brief)
    console.log('═'.repeat(60))
  } else {
    console.log('   Summary (no Claude brief - may need ANTHROPIC_API_KEY):')
    console.log(reportData.summary?.substring(0, 500))
  }

  console.log(`\n✅ Test complete!`)
  console.log(`   Total insights: ${reportData.totalInsights}`)
  console.log(`   High confidence: ${reportData.highConfidenceInsights}`)
  console.log(`   Benchmarks: ${reportData.benchmarkInsights}`)
  console.log(`   Categories: ${JSON.stringify(reportData.categories)}`)
}

main().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
