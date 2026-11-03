-- AlterTable
ALTER TABLE "BlogRebuildState" DROP COLUMN "lastTriggeredAt",
ADD COLUMN     "lastEditAt" TIMESTAMP(3),
ADD COLUMN     "lastRebuiltAt" TIMESTAMP(3);
