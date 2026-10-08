import { prisma } from "@/lib/db";
import { getSyncedUpcomingEdition } from "@/lib/zine";
import { publishEdition } from "@/lib/zine-publish";
import { upcomingEditionRange } from "@/lib/week";
import type { Area, ZineEdition } from "@prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;
const CHECK_EVERY_MS = 10 * 60 * 1000;
/** Sunday at this hour, Finnish time, before the edition's Monday. */
const PUBLISH_HOUR = 7;

/**
 * The moment an edition is published automatically: the Sunday morning
 * before its week starts, which leaves the day and Monday morning to print
 * it before it is handed out during the week.
 */
export function editionPublishTime(edition: Pick<ZineEdition, "startDate">): Date {
  // The edition's Monday as a date in Finland, whatever the server's own
  // time zone (its local midnight is 00:00 or 03:00 there, never another day).
  const monday = helsinkiParts(edition.startDate);
  return helsinkiTime(monday.year, monday.month - 1, monday.day - 1, PUBLISH_HOUR);
}

/**
 * Publishes every live area's paper that has reached its publish time and
 * whose week is not over yet. Safe to run any number of times: a published
 * edition is skipped. A server that was down on Sunday morning catches up
 * when it comes back, as long as the edition's week is still running.
 */
export async function publishDueEditions(now: Date = new Date()): Promise<string[]> {
  const published: string[] = [];
  const areas = await prisma.area.findMany({ where: { active: true } });

  for (const area of areas) {
    try {
      // Nobody may have opened the admin this week, so make sure the
      // coming week's edition exists once it is due.
      if (now >= editionPublishTime(upcomingEditionRange(now))) {
        await getSyncedUpcomingEdition(area);
      }

      const drafts = await prisma.zineEdition.findMany({ where: { areaId: area.id, status: "DRAFT" } });
      for (const edition of drafts) {
        const weekOver = now.getTime() >= edition.endDate.getTime() + DAY_MS;
        if (now < editionPublishTime(edition) || weekOver) continue;
        await publishEdition(edition, area as Area);
        published.push(`${area.id} ${edition.startDate.toISOString().slice(0, 10)}`);
      }
    } catch (err) {
      console.error(`[lehti] Automatic publishing failed for ${area.id}:`, err);
    }
  }

  if (published.length > 0) console.log(`[lehti] Published automatically: ${published.join(", ")}`);
  return published;
}

declare global {
  var zineScheduleStarted: boolean | undefined;
}

/** Called once from src/instrumentation.ts when the server starts. */
export function startZineSchedule(): void {
  if (globalThis.zineScheduleStarted) return;
  globalThis.zineScheduleStarted = true;

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await publishDueEditions();
    } finally {
      running = false;
    }
  };
  setTimeout(tick, 30_000).unref();
  setInterval(tick, CHECK_EVERY_MS).unref();
}

/** The instant the clock in Finland reads the given date and hour. */
function helsinkiTime(year: number, month: number, day: number, hour: number): Date {
  const guess = Date.UTC(year, month, day, hour);
  return new Date(guess - helsinkiOffsetMs(new Date(guess)));
}

function helsinkiOffsetMs(at: Date): number {
  const p = helsinkiParts(at);
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return wall - Math.floor(at.getTime() / 60_000) * 60_000;
}

function helsinkiParts(at: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Helsinki",
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute") };
}
