-- CreateTable
CREATE TABLE "NaMeeting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "weekday" TEXT NOT NULL,
    "weekdayIndex" INTEGER NOT NULL,
    "time" TEXT NOT NULL,
    "durationMinutes" INTEGER,
    "address" TEXT,
    "postalCode" TEXT,
    "city" TEXT NOT NULL,
    "notes" TEXT,
    "formats" TEXT,
    "mapLink" TEXT,
    "lat" REAL,
    "lng" REAL,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "onBreakUntil" DATETIME,
    "sourceUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "NaMeeting_sourceId_key" ON "NaMeeting"("sourceId");

-- CreateIndex
CREATE INDEX "NaMeeting_weekdayIndex_idx" ON "NaMeeting"("weekdayIndex");

-- CreateTable
CREATE TABLE "BannedIp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ipAddress" TEXT NOT NULL,
    "reason" TEXT,
    "bannedUntil" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "BannedIp_ipAddress_key" ON "BannedIp"("ipAddress");

-- RedefineTable: ServiceExperience -> Experience (serviceId becomes
-- optional, add meetingId + ipAddress). SQLite needs a full table
-- rebuild to relax a NOT NULL constraint.
PRAGMA foreign_keys=OFF;
CREATE TABLE "Experience" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT,
    "meetingId" TEXT,
    "body" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Experience_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "DirectoryService" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Experience_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "NaMeeting" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "Experience" ("id", "serviceId", "body", "createdAt")
    SELECT "id", "serviceId", "body", "createdAt" FROM "ServiceExperience";
DROP TABLE "ServiceExperience";
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE INDEX "Experience_serviceId_idx" ON "Experience"("serviceId");

-- CreateIndex
CREATE INDEX "Experience_meetingId_idx" ON "Experience"("meetingId");

-- CreateIndex
CREATE INDEX "Experience_createdAt_idx" ON "Experience"("createdAt");
