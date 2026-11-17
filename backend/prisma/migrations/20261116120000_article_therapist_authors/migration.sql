-- AlterEnum
ALTER TYPE "ArticleStatus" ADD VALUE 'PENDING_REVIEW';
ALTER TYPE "ArticleStatus" ADD VALUE 'CHANGES_REQUESTED';

-- AlterTable
ALTER TABLE "Article" ADD COLUMN "authorUserId" TEXT,
ADD COLUMN "reviewNote" TEXT,
ADD COLUMN "submittedAt" TIMESTAMP(3),
ALTER COLUMN "categoryId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Article_authorUserId_idx" ON "Article"("authorUserId");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
