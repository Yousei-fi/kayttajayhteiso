-- CreateTable
CREATE TABLE "CommunityEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME,
    "location" TEXT,
    "body" TEXT NOT NULL,
    "includeInZine" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommunityEvent_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SiteSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "orgName" TEXT NOT NULL DEFAULT 'Tampereen Käyttäjäyhteisö',
    "description" TEXT NOT NULL DEFAULT '',
    "aboutText" TEXT NOT NULL DEFAULT '',
    "contactInfo" TEXT NOT NULL DEFAULT '',
    "socialInfo" TEXT NOT NULL DEFAULT '',
    "backPageText" TEXT NOT NULL DEFAULT '',
    "logoPath" TEXT NOT NULL DEFAULT '/branding/logo.jpeg',
    "submissionEmail" TEXT NOT NULL DEFAULT 'trekayttajayhteiso@proton.me',
    "publicSiteUrl" TEXT NOT NULL DEFAULT 'https://kuntoutus.info'
);
INSERT INTO "new_SiteSettings" ("aboutText", "backPageText", "contactInfo", "description", "id", "logoPath", "orgName", "publicSiteUrl", "socialInfo", "submissionEmail") SELECT "aboutText", "backPageText", "contactInfo", "description", "id", "logoPath", "orgName", "publicSiteUrl", "socialInfo", "submissionEmail" FROM "SiteSettings";
DROP TABLE "SiteSettings";
ALTER TABLE "new_SiteSettings" RENAME TO "SiteSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CommunityEvent_authorId_idx" ON "CommunityEvent"("authorId");

-- CreateIndex
CREATE INDEX "CommunityEvent_startsAt_idx" ON "CommunityEvent"("startsAt");
