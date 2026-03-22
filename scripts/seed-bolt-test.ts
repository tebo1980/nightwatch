import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find or create a test AgentClient
  let testClient = await prisma.agentClient.findFirst({
    where: { businessName: 'Test Plumbing Co' },
  })

  if (!testClient) {
    testClient = await prisma.agentClient.create({
      data: {
        businessName: 'Test Plumbing Co',
        industry: 'Plumbing',
        ownerName: 'Test Owner',
        ownerFirstName: 'Test',
        ownerEmail: 'test@baratrust.com',
        contactPhone: '555-123-4567',
        city: 'Louisville',
        state: 'KY',
        servicesOffered: 'Plumbing',
      },
    })
    console.log('Created test AgentClient:', testClient.id)
  } else {
    console.log('Found existing test AgentClient:', testClient.id)
  }

  // Create or update Bolt config
  const existing = await prisma.clientBoltConfig.findUnique({
    where: { clientSlug: 'test-plumber' },
  })

  if (existing) {
    console.log('Test Bolt config already exists:', existing.id)
  } else {
    const config = await prisma.clientBoltConfig.create({
      data: {
        clientId: testClient.id,
        clientSlug: 'test-plumber',
        businessName: 'Test Plumbing Co',
        businessPhone: '555-123-4567',
        businessEmail: 'test@baratrust.com',
        businessAddress: '123 Test St, Louisville, KY 40202',
        trade: 'Plumber',
        laborRatePerHour: 85,
        minimumJobSize: 150,
        taxRate: 6,
        escalationClause: true,
      },
    })
    console.log('Created test Bolt config:', config.id, '— slug: test-plumber')
  }

  console.log('\nTest URL: /bolt/test-plumber')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
