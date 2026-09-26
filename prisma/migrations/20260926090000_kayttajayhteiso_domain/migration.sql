-- The site moves to its own domain (tampere.kayttajayhteiso.fi) and mailbox
-- (tampere@kayttajayhteiso.fi), replacing kuntoutus.info and the Proton
-- address. Two halves to this: repoint the column defaults for fresh
-- installs, and carry existing rows over.
--
-- SQLite cannot ALTER a column default, so changing one means rebuilding the
-- table (same shape as the earlier logo_jpeg_default migration).
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
    "submissionEmail" TEXT NOT NULL DEFAULT 'tampere@kayttajayhteiso.fi',
    "publicSiteUrl" TEXT NOT NULL DEFAULT 'https://tampere.kayttajayhteiso.fi'
);
INSERT INTO "new_SiteSettings" ("aboutText", "backPageText", "contactInfo", "description", "id", "logoPath", "orgName", "publicSiteUrl", "socialInfo", "submissionEmail") SELECT "aboutText", "backPageText", "contactInfo", "description", "id", "logoPath", "orgName", "publicSiteUrl", "socialInfo", "submissionEmail" FROM "SiteSettings";
DROP TABLE "SiteSettings";
ALTER TABLE "new_SiteSettings" RENAME TO "SiteSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Carry an already-deployed row onto the new addresses, but only where it
-- still holds exactly what this project shipped as the default. A value an
-- admin has typed themselves at /admin/asetukset is left alone, matching the
-- exact-value-only rule prisma/seed-reference.ts follows.
UPDATE "SiteSettings"
   SET "submissionEmail" = 'tampere@kayttajayhteiso.fi'
 WHERE "submissionEmail" IN ('trekayttajayhteiso@proton.me', '');

UPDATE "SiteSettings"
   SET "publicSiteUrl" = 'https://tampere.kayttajayhteiso.fi'
 WHERE "publicSiteUrl" IN ('https://kuntoutus.info', '');

UPDATE "SiteSettings"
   SET "contactInfo" = 'tampere@kayttajayhteiso.fi'
 WHERE "contactInfo" IN ('trekayttajayhteiso@gmail.com', 'trekayttajayhteiso@proton.me', 'info@kayttajayhteiso.fi', '');
