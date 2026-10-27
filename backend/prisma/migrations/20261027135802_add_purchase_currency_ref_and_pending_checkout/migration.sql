-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "currency" TEXT NOT NULL,
ADD COLUMN     "providerRef" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "PendingOfferingCheckout" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "buyerPhone" TEXT,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingOfferingCheckout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_providerRef_key" ON "Purchase"("providerRef");

