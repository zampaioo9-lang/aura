-- DropIndex
DROP INDEX "Category_slug_key";

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_audience_key" ON "Category"("slug", "audience");
