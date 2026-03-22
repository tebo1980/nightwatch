-- AlterTable
ALTER TABLE "ScraperLog" ADD COLUMN     "isReferenceFailure" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ScraperTarget" ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isReference" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceStore" TEXT;

-- CreateTable
CREATE TABLE "MaterialPrice" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trade" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "currentPrice" DOUBLE PRECISION,
    "previousPrice" DOUBLE PRECISION,
    "percentChange" DOUBLE PRECISION,
    "lowPrice" DOUBLE PRECISION,
    "highPrice" DOUBLE PRECISION,
    "sourceUrl" TEXT,
    "hdPrice" DOUBLE PRECISION,
    "lowesPrice" DOUBLE PRECISION,
    "menardsPrice" DOUBLE PRECISION,
    "supplyHousePrice" DOUBLE PRECISION,
    "sherwinWilliamsPrice" DOUBLE PRECISION,
    "amazonPrice" DOUBLE PRECISION,
    "walmartPrice" DOUBLE PRECISION,
    "targetPrice" DOUBLE PRECISION,
    "primarySource" TEXT,
    "category" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceAlert" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "sourceStore" TEXT,
    "previousPrice" DOUBLE PRECISION NOT NULL,
    "newPrice" DOUBLE PRECISION NOT NULL,
    "percentChange" DOUBLE PRECISION NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceAlert_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PriceAlert" ADD CONSTRAINT "PriceAlert_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "MaterialPrice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
