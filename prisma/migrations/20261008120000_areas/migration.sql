-- One national site with a section per area. Adds Area and an areaId on
-- everything tied to a place, and moves the per-place settings (contact
-- address, Telegram, submission address) off SiteSettings onto the area.
--
-- Every existing row is Tampere's: this database is the old single-community
-- site, so this migration is also the import. Running it on a copy of the old
-- volume carries every row across with its id unchanged, which keeps
-- /palvelut/<id>, /artikkelit/<id>, Kokemus links and ZineItem.sourceId
-- references intact.
--
-- Articles stay arealess: they are national from here on.

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nameGenitive" TEXT NOT NULL,
    "nameInessive" TEXT NOT NULL,
    "naCityNames" TEXT NOT NULL DEFAULT '',
    "mapLat" REAL NOT NULL,
    "mapLng" REAL NOT NULL,
    "mapZoom" INTEGER NOT NULL DEFAULT 12,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "aboutText" TEXT NOT NULL DEFAULT '',
    "contactInfo" TEXT NOT NULL DEFAULT '',
    "socialInfo" TEXT NOT NULL DEFAULT '',
    "submissionEmail" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- The three areas. Only Tampere is live; the others stay inactive (404) until
-- each has a services list, an admin and a first paper.
INSERT INTO "Area" ("id", "name", "nameGenitive", "nameInessive", "naCityNames", "mapLat", "mapLng", "mapZoom", "active", "sortOrder")
VALUES
    ('paakaupunkiseutu', 'Pääkaupunkiseutu', 'Pääkaupunkiseudun', 'pääkaupunkiseudulla', 'Helsinki,Espoo,Vantaa,Kauniainen', 60.1921, 24.8327, 11, false, 1),
    ('tampere', 'Tampere', 'Tampereen', 'Tampereella', 'Tampere', 61.4978, 23.761, 12, true, 2),
    ('turku', 'Turku', 'Turun', 'Turussa', 'Turku', 60.4518, 22.2666, 12, false, 3);

-- Tampere's contact details and about text were the site's own until now.
UPDATE "Area" SET
    "contactInfo"     = COALESCE((SELECT "contactInfo" FROM "SiteSettings" WHERE "id" = 1), 'tampere@kayttajayhteiso.fi'),
    "socialInfo"      = COALESCE((SELECT "socialInfo" FROM "SiteSettings" WHERE "id" = 1), ''),
    "submissionEmail" = COALESCE((SELECT "submissionEmail" FROM "SiteSettings" WHERE "id" = 1), 'tampere@kayttajayhteiso.fi'),
    "aboutText"       = COALESCE((SELECT "aboutText" FROM "SiteSettings" WHERE "id" = 1), '')
WHERE "id" = 'tampere';

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "areaId" TEXT NOT NULL,
    "serviceUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "validFrom" DATETIME,
    "validUntil" DATETIME,
    "includeInZine" BOOLEAN NOT NULL DEFAULT true,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Alert_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Alert_serviceUserId_fkey" FOREIGN KEY ("serviceUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Alert" ("areaId", "archived", "body", "createdAt", "id", "includeInZine", "serviceUserId", "title", "updatedAt", "validFrom", "validUntil") SELECT 'tampere', "archived", "body", "createdAt", "id", "includeInZine", "serviceUserId", "title", "updatedAt", "validFrom", "validUntil" FROM "Alert";
DROP TABLE "Alert";
ALTER TABLE "new_Alert" RENAME TO "Alert";
CREATE INDEX "Alert_areaId_idx" ON "Alert"("areaId");
CREATE INDEX "Alert_serviceUserId_idx" ON "Alert"("serviceUserId");
CREATE TABLE "new_CommunityEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "areaId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME,
    "location" TEXT,
    "body" TEXT NOT NULL,
    "includeInZine" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommunityEvent_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CommunityEvent_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CommunityEvent" ("areaId", "authorId", "body", "createdAt", "endsAt", "id", "includeInZine", "location", "startsAt", "title", "updatedAt") SELECT 'tampere', "authorId", "body", "createdAt", "endsAt", "id", "includeInZine", "location", "startsAt", "title", "updatedAt" FROM "CommunityEvent";
DROP TABLE "CommunityEvent";
ALTER TABLE "new_CommunityEvent" RENAME TO "CommunityEvent";
CREATE INDEX "CommunityEvent_areaId_idx" ON "CommunityEvent"("areaId");
CREATE INDEX "CommunityEvent_authorId_idx" ON "CommunityEvent"("authorId");
CREATE INDEX "CommunityEvent_startsAt_idx" ON "CommunityEvent"("startsAt");
CREATE TABLE "new_DirectoryService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "areaId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "description" TEXT,
    "lat" REAL,
    "lng" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DirectoryService_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DirectoryService" ("areaId", "address", "category", "createdAt", "description", "id", "lat", "lng", "name", "phone") SELECT 'tampere', "address", "category", "createdAt", "description", "id", "lat", "lng", "name", "phone" FROM "DirectoryService";
DROP TABLE "DirectoryService";
ALTER TABLE "new_DirectoryService" RENAME TO "DirectoryService";
CREATE UNIQUE INDEX "DirectoryService_areaId_category_name_key" ON "DirectoryService"("areaId", "category", "name");
CREATE TABLE "new_NaMeeting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "areaId" TEXT NOT NULL,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NaMeeting_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_NaMeeting" ("areaId", "address", "cancelled", "city", "createdAt", "durationMinutes", "formats", "id", "lat", "lng", "mapLink", "name", "notes", "onBreakUntil", "postalCode", "sourceId", "sourceUrl", "time", "weekday", "weekdayIndex") SELECT 'tampere', "address", "cancelled", "city", "createdAt", "durationMinutes", "formats", "id", "lat", "lng", "mapLink", "name", "notes", "onBreakUntil", "postalCode", "sourceId", "sourceUrl", "time", "weekday", "weekdayIndex" FROM "NaMeeting";
DROP TABLE "NaMeeting";
ALTER TABLE "new_NaMeeting" RENAME TO "NaMeeting";
CREATE UNIQUE INDEX "NaMeeting_sourceId_key" ON "NaMeeting"("sourceId");
CREATE INDEX "NaMeeting_areaId_idx" ON "NaMeeting"("areaId");
CREATE INDEX "NaMeeting_weekdayIndex_idx" ON "NaMeeting"("weekdayIndex");
CREATE TABLE "new_SiteSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "orgName" TEXT NOT NULL DEFAULT 'Käyttäjäyhteisö',
    "description" TEXT NOT NULL DEFAULT '',
    "aboutText" TEXT NOT NULL DEFAULT '',
    "backPageText" TEXT NOT NULL DEFAULT '',
    "logoPath" TEXT NOT NULL DEFAULT '/branding/kayttajayhteiso.jpg',
    "publicSiteUrl" TEXT NOT NULL DEFAULT 'https://kayttajayhteiso.fi'
);
INSERT INTO "new_SiteSettings" ("aboutText", "backPageText", "description", "id", "logoPath", "orgName", "publicSiteUrl") SELECT "aboutText", "backPageText", "description", "id", "logoPath", "orgName", "publicSiteUrl" FROM "SiteSettings";
DROP TABLE "SiteSettings";
ALTER TABLE "new_SiteSettings" RENAME TO "SiteSettings";
CREATE TABLE "new_StreetRound" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "areaId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "participants" TEXT,
    "place" TEXT,
    "notes" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StreetRound_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StreetRound_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- The free-text part of town moves from "area" to "place".
INSERT INTO "new_StreetRound" ("areaId", "place", "authorId", "createdAt", "date", "id", "notes", "participants", "updatedAt") SELECT 'tampere', "area", "authorId", "createdAt", "date", "id", "notes", "participants", "updatedAt" FROM "StreetRound";
DROP TABLE "StreetRound";
ALTER TABLE "new_StreetRound" RENAME TO "StreetRound";
CREATE INDEX "StreetRound_areaId_idx" ON "StreetRound"("areaId");
CREATE INDEX "StreetRound_authorId_idx" ON "StreetRound"("authorId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "serviceName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "areaId" TEXT,
    CONSTRAINT "User_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
-- Members and service accounts were Tampere's. Admins become national admins
-- (no area): someone has to be, and they can be narrowed to one area later at
-- /admin/kayttajat.
INSERT INTO "new_User" ("areaId", "active", "createdAt", "email", "id", "name", "passwordHash", "role", "serviceName") SELECT CASE WHEN "role" = 'ADMIN' THEN NULL ELSE 'tampere' END, "active", "createdAt", "email", "id", "name", "passwordHash", "role", "serviceName" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "new_ZineEdition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "areaId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" DATETIME,
    "pdfPath" TEXT,
    "coverNote" TEXT,
    CONSTRAINT "ZineEdition_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ZineEdition" ("areaId", "coverNote", "createdAt", "endDate", "id", "pdfPath", "publishedAt", "startDate", "status") SELECT 'tampere', "coverNote", "createdAt", "endDate", "id", "pdfPath", "publishedAt", "startDate", "status" FROM "ZineEdition";
DROP TABLE "ZineEdition";
ALTER TABLE "new_ZineEdition" RENAME TO "ZineEdition";
CREATE UNIQUE INDEX "ZineEdition_areaId_startDate_endDate_key" ON "ZineEdition"("areaId", "startDate", "endDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;


-- The national row: retire the Tampere-only name, logo and address, but only
-- where they still hold exactly what was shipped, as earlier migrations do.
UPDATE "SiteSettings" SET "orgName" = 'Käyttäjäyhteisö' WHERE "orgName" IN ('Tampereen Käyttäjäyhteisö', '');
UPDATE "SiteSettings" SET "logoPath" = '/branding/kayttajayhteiso.jpg' WHERE "logoPath" IN ('/branding/logo.jpeg', '');
UPDATE "SiteSettings" SET "publicSiteUrl" = 'https://kayttajayhteiso.fi'
 WHERE "publicSiteUrl" IN ('https://tampere.kayttajayhteiso.fi', 'https://kuntoutus.info', '');
