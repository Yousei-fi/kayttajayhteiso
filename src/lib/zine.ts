import { prisma } from "@/lib/db";
import { articleWindowStart, upcomingEditionRange } from "@/lib/week";
import type { ZineEdition } from "@prisma/client";

/**
 * The directory (services, NA meetings) for the zine's "Palvelut"/
 * "NA-ryhmät" sections, with services carrying the Kokemukset posted
 * during a given edition's week. Unlike alerts/articles these aren't
 * snapshotted into ZineItem — the directories themselves barely change,
 * and Experience rows are already immutable historical records once a
 * week has passed, so a live query naturally gives the same stable
 * result for any past week (aside from an admin later deleting an
 * abusive post, which should disappear everywhere). NA meetings carry no
 * Kokemukset: posting them was removed, so the section is the meeting
 * list alone.
 */
export async function getZineDirectorySections(weekStart: Date, weekEnd: Date) {
  const weekEndExclusive = new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000);
  const experienceWindow = { gte: weekStart, lt: weekEndExclusive };

  const [services, meetings] = await Promise.all([
    prisma.directoryService.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: { experiences: { where: { createdAt: experienceWindow }, orderBy: { createdAt: "desc" } } },
    }),
    prisma.naMeeting.findMany({
      where: { cancelled: false },
      orderBy: [{ weekdayIndex: "asc" }, { time: "asc" }],
    }),
  ]);

  return { services, meetings };
}

/**
 * Finds (or creates) the DRAFT edition for the upcoming Monday-Sunday
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
  const [alerts, articles, events, existingItems] = await Promise.all([
    prisma.alert.findMany({
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
        createdAt: { gte: articleWindowStart(weekStart) },
      },
      include: { author: true },
    }),
    prisma.communityEvent.findMany({
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
