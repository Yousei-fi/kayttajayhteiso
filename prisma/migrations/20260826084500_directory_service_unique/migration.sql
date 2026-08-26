-- DropIndex
DROP INDEX "DirectoryService_category_idx";

-- CreateIndex
CREATE UNIQUE INDEX "DirectoryService_category_name_key" ON "DirectoryService"("category", "name");
