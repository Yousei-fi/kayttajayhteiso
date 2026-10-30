-- Three changes:
--
-- 1. The Telegram group is gone from the site, so Area.socialInfo goes too.
-- 2. Articles and events say how long they run in the paper (zineUntil: the
--    Monday of the last edition they print in). Existing articles keep the
--    run they already had: an article used to qualify for every edition
--    starting within a month of being written, so its zineUntil is the
--    moment it was written plus one month. Events keep running until they
--    are over (zineUntil stays empty).
-- 3. Anonymous comments on articles.

ALTER TABLE "Area" DROP COLUMN "socialInfo";

ALTER TABLE "CommunityEvent" ADD COLUMN "zineUntil" DATETIME;

-- RedefineTables: a NOT NULL column with no default needs a table rebuild.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Article" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imagePath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "includeInZine" BOOLEAN NOT NULL DEFAULT true,
    "excludedFromZines" BOOLEAN NOT NULL DEFAULT false,
    "zineUntil" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Article_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Article" ("authorId", "body", "createdAt", "excludedFromZines", "id", "imagePath", "includeInZine", "status", "title", "updatedAt", "zineUntil")
SELECT "authorId", "body", "createdAt", "excludedFromZines", "id", "imagePath", "includeInZine", "status", "title", "updatedAt",
       CAST(strftime('%s', "createdAt" / 1000, 'unixepoch', '+1 month') AS INTEGER) * 1000 + "createdAt" % 1000
FROM "Article";
DROP TABLE "Article";
ALTER TABLE "new_Article" RENAME TO "Article";
CREATE INDEX "Article_authorId_idx" ON "Article"("authorId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

CREATE TABLE "ArticleComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "articleId" TEXT NOT NULL,
    "nickname" TEXT,
    "body" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArticleComment_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ArticleComment_articleId_createdAt_idx" ON "ArticleComment"("articleId", "createdAt");
CREATE INDEX "ArticleComment_createdAt_idx" ON "ArticleComment"("createdAt");
