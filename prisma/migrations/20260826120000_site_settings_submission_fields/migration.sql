-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN "submissionEmail" TEXT NOT NULL DEFAULT 'trekayttajayhteiso@proton.me';
ALTER TABLE "SiteSettings" ADD COLUMN "publicSiteUrl" TEXT NOT NULL DEFAULT 'https://kuntoutus.info';
