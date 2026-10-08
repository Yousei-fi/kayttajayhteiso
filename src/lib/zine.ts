import { prisma, areaDb } from "@/lib/db";
import { articleWindowStart, upcomingEditionRange } from "@/lib/week";
import type { Area, ZineEdition } from "@prisma/client";

/**
 * The directory (services, NA meetings) for the zine's "Palvelut"/
 * "NA-ryhmät" sections, with services carrying the Kokemukset posted
 * during the week before the edition (it is printed before its own week). Unlike alerts/articles these aren't
 * snapshotted into ZineItem — the directories themselves barely change,
 * and Experience rows are already immutable historical records once a
 * week has passed, so a live query naturally gives the same stable
 * result for any past week (aside from an admin later deleting an
 * abusive post, which should disappear everywhere). NA meetings carry no
 * Kokemukset: posting them was removed, so the section is the meeting
 * list alone.
 */
export async function getZineDirectorySections(edition: Pick<ZineEdition, "areaId" | "startDate" | "endDate">) {
  const db = areaDb(edition.areaId);
  // The week before the edition: it is printed before its own week starts.
  const experienceWindow = { gte: new Date(edition.startDate.getTime() - 7 * 24 * 60 * 60 * 1000), lt: edition.startDate };

  const [services, meetings] = await Promise.all([
    db.directoryService.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: { experiences: { where: { createdAt: experienceWindow }, orderBy: { createdAt: "desc" } } },
    }),
    db.naMeeting.findMany({
      where: { cancelled: false },
      orderBy: [{ weekdayIndex: "asc" }, { time: "asc" }],
    }),
  ]);

  return { services, meetings };
}

/**
 * Finds (or creates) the area's DRAFT edition for the upcoming Monday-Sunday
 * period, then syncs its items against currently-qualifying alerts and
 * articles: new qualifying content is appended, content that no longer
 * qualifies is dropped, and content still qualifying has its snapshot
 * refreshed. Manual admin ordering and exclusions are preserved.
 *
 * Alerts qualify for the edition's week; articles qualify for the month
 * up to it (see articleWindowStart), so the same article can run in
 * several consecutive issues before ageing out; community events qualify
 * while they are still ahead of the edition, however far ahead that is —
 * a date people need to plan around is worth printing early.
 *
 * Alerts and events are the area's own; articles are national, so every
 * area's edition draws on the same ones, and an article a national admin
 * has excluded from the papers (excludedFromZines) leaves every DRAFT
 * edition on its next sync. FINAL editions keep what they printed.
 */
export async function getSyncedUpcomingEdition(area: Pick<Area, "id">): Promise<ZineEdition> {
  const { startDate, endDate } = upcomingEditionRange();

  const edition = await areaDb(area.id).zineEdition.upsert({
    where: { areaId_startDate_endDate: { areaId: area.id, startDate, endDate } },
    update: {},
    create: { areaId: area.id, startDate, endDate, status: "DRAFT" },
  });

  if (edition.status === "DRAFT") {
    await syncEditionItems(edition);
  }

  return edition;
}

export async function syncEditionItems(
  edition: Pick<ZineEdition, "id" | "areaId" | "startDate">,
): Promise<void> {
  const db = areaDb(edition.areaId);
  const { id: editionId, startDate: weekStart } = edition;
  const [alerts, articles, events, existingItems] = await Promise.all([
    db.alert.findMany({
      where: {
        archived: false,
        includeInZine: true,
        OR: [{ validUntil: null }, { validUntil: { gte: weekStart } }],
      },
      include: { service: true },
    }),
    prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        includeInZine: true,
        excludedFromZines: false,
        createdAt: { gte: articleWindowStart(weekStart) },
      },
      include: { author: true },
    }),
    db.communityEvent.findMany({
      where: {
        includeInZine: true,
        OR: [{ endsAt: { gte: weekStart } }, { endsAt: null, startsAt: { gte: weekStart } }],
      },
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

  for (const event of events) {
    qualifyingKeys.add(`EVENT:${event.id}`);
    const existing = existingItems.find(
      (i) => i.contentType === "EVENT" && i.sourceId === event.id,
    );
    const meta = JSON.stringify({
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      location: event.location,
    });
    if (existing) {
      await prisma.zineItem.update({
        where: { id: existing.id },
        data: {
          titleSnapshot: event.title,
          bodySnapshot: event.body,
          authorSnapshot: event.author.name,
          metaSnapshot: meta,
        },
      });
    } else {
      await prisma.zineItem.create({
        data: {
          editionId,
          contentType: "EVENT",
          sourceId: event.id,
          titleSnapshot: event.title,
          bodySnapshot: event.body,
          authorSnapshot: event.author.name,
          metaSnapshot: meta,
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
