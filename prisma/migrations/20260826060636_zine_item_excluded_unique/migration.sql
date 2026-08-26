-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ZineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "editionId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "titleSnapshot" TEXT NOT NULL,
    "bodySnapshot" TEXT NOT NULL,
    "authorSnapshot" TEXT NOT NULL,
    "imageSnapshot" TEXT,
    "metaSnapshot" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "excluded" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ZineItem_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "ZineEdition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ZineItem" ("authorSnapshot", "bodySnapshot", "contentType", "editionId", "id", "imageSnapshot", "metaSnapshot", "sortOrder", "sourceId", "titleSnapshot") SELECT "authorSnapshot", "bodySnapshot", "contentType", "editionId", "id", "imageSnapshot", "metaSnapshot", "sortOrder", "sourceId", "titleSnapshot" FROM "ZineItem";
DROP TABLE "ZineItem";
ALTER TABLE "new_ZineItem" RENAME TO "ZineItem";
CREATE INDEX "ZineItem_editionId_idx" ON "ZineItem"("editionId");
CREATE UNIQUE INDEX "ZineItem_editionId_contentType_sourceId_key" ON "ZineItem"("editionId", "contentType", "sourceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
