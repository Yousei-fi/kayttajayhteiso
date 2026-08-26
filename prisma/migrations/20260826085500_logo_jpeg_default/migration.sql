-- AlterTable: point the SiteSettings default at the real logo now that one exists.
-- SQLite requires a full table rebuild to change a column default.
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SiteSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "orgName" TEXT NOT NULL DEFAULT 'Tampereen Käyttäjäyhteisö',
    "description" TEXT NOT NULL DEFAULT '',
    "contactInfo" TEXT NOT NULL DEFAULT '',
    "socialInfo" TEXT NOT NULL DEFAULT '',
    "backPageText" TEXT NOT NULL DEFAULT '',
    "logoPath" TEXT NOT NULL DEFAULT '/branding/logo.jpeg'
);
INSERT INTO "new_SiteSettings" ("id", "orgName", "description", "contactInfo", "socialInfo", "backPageText", "logoPath")
    SELECT "id", "orgName", "description", "contactInfo", "socialInfo", "backPageText", "logoPath" FROM "SiteSettings";
DROP TABLE "SiteSettings";
ALTER TABLE "new_SiteSettings" RENAME TO "SiteSettings";
PRAGMA foreign_keys=ON;
