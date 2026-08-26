-- CreateTable
CREATE TABLE "DirectoryService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "description" TEXT,
    "lat" REAL,
    "lng" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ServiceExperience" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceExperience_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "DirectoryService" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DirectoryService_category_idx" ON "DirectoryService"("category");

-- CreateIndex
CREATE INDEX "ServiceExperience_serviceId_idx" ON "ServiceExperience"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceExperience_createdAt_idx" ON "ServiceExperience"("createdAt");
