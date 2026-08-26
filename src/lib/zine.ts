import { prisma } from "@/lib/db";
import { upcomingEditionRange } from "@/lib/week";
import type { ZineEdition } from "@prisma/client";

/**
 * Finds (or creates) the DRAFT edition for the upcoming Monday-Sunday
 * period, then syncs its items against currently-qualifying alerts and
 * articles: new qualifying content is appended, content that no longer
 * qualifies is dropped, and content still qualifying has its snapshot
 * refreshed. Manual admin ordering and exclusions are preserved.
 */
export async function getSyncedUpcomingEdition(): Promise<ZineEdition> {
  const { startDate, endDate } = upcomingEditionRange();

  const edition = await prisma.zineEdition.upsert({
    where: { startDate_endDate: { startDate, endDate } },
    update: {},
    create: { startDate, endDate, status: "DRAFT" },
  });

  if (edition.status === "DRAFT") {
    await syncEditionItems(edition.id, startDate);
  }

  return edition;
}

export async function syncEditionItems(editionId: string, weekStart: Date): Promise<void> {
  const [alerts, articles, existingItems] = await Promise.all([
    prisma.alert.findMany({
      where: {
        archived: false,
        includeInZine: true,
        OR: [{ validUntil: null }, { validUntil: { gte: weekStart } }],
      },
      include: { service: true },
    }),
    prisma.article.findMany({
      where: { status: "PUBLISHED", includeInZine: true },
      include: { author: true },
    }),
    prisma.zineItem.findMany({ where: { editionId } }),
  ]);

  const qualifyingKeys = new Set<string>();
  let nextSortOrder =
    existingItems.length > 0
      ? Math.max(...existingItems.map((i) => i.sortOrder)) + 1
      : 0;

  for (const alert of alerts) {
    const key = `ALERT:${alert.id}`;
    qualifyingKeys.add(key);
    const existing = existingItems.find(
      (i) => i.contentType === "ALERT" && i.sourceId === alert.id,
    );
    const meta = JSON.stringify({
      validFrom: alert.validFrom,
      validUntil: alert.validUntil,
    });
    if (existing) {
      await prisma.zineItem.update({
        where: { id: existing.id },
        data: {
          titleSnapshot: alert.title,
          bodySnapshot: alert.body,
          authorSnapshot: alert.service.serviceName ?? alert.service.name,
          metaSnapshot: meta,
        },
      });
    } else {
      await prisma.zineItem.create({
        data: {
          editionId,
          contentType: "ALERT",
          sourceId: alert.id,
          titleSnapshot: alert.title,
          bodySnapshot: alert.body,
          authorSnapshot: alert.service.serviceName ?? alert.service.name,
          metaSnapshot: meta,
          sortOrder: nextSortOrder++,
        },
      });
    }
  }

  for (const article of articles) {
    const key = `ARTICLE:${article.id}`;
    qualifyingKeys.add(key);
    const existing = existingItems.find(
      (i) => i.contentType === "ARTICLE" && i.sourceId === article.id,
    );
    if (existing) {
      await prisma.zineItem.update({
        where: { id: existing.id },
        data: {
          titleSnapshot: article.title,
          bodySnapshot: article.body,
          authorSnapshot: article.author.name,
          imageSnapshot: article.imagePath,
        },
      });
    } else {
      await prisma.zineItem.create({
        data: {
          editionId,
          contentType: "ARTICLE",
          sourceId: article.id,
          titleSnapshot: article.title,
          bodySnapshot: article.body,
          authorSnapshot: article.author.name,
          imageSnapshot: article.imagePath,
          sortOrder: nextSortOrder++,
        },
      });
    }
  }

  const stale = existingItems.filter(
    (i) => !qualifyingKeys.has(`${i.contentType}:${i.sourceId}`),
  );
  if (stale.length > 0) {
    await prisma.zineItem.deleteMany({
      where: { id: { in: stale.map((i) => i.id) } },
    });
  }
}
