import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Delete logs first (foreign key constraint)
  const logsDeleted = await prisma.scraperLog.deleteMany({})
  console.log(`Deleted ${logsDeleted.count} scraper logs`)

  const deleted = await prisma.scraperTarget.deleteMany({})
  console.log(`Deleted ${deleted.count} scraper targets`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
