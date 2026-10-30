import { upcomingEditionRange } from "@/lib/week";
import { editionPublishTime } from "@/lib/zine-schedule";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** How many weekly issues an article can be set to run in. */
export const ARTICLE_RUNS = [1, 2, 3, 4, 6, 8] as const;
export const DEFAULT_ARTICLE_RUN = 4;
/** An event runs until it is over unless it is limited to one of these. */
export const EVENT_RUNS = [1, 2, 3, 4] as const;

/**
 * The Monday of the first edition something saved now can still get into:
 * the coming week's, unless that one has already been published (from
 * Sunday morning on), in which case the week after.
 */
export function firstOpenEditionStart(now: Date = new Date()): Date {
  const upcoming = upcomingEditionRange(now);
  if (now < editionPublishTime(upcoming)) return upcoming.startDate;
  return new Date(upcoming.startDate.getTime() + WEEK_MS);
}

/** zineUntil for a run of `issues` weekly issues, starting with the first open edition. */
export function zineUntilForRun(issues: number, now: Date = new Date()): Date {
  return new Date(firstOpenEditionStart(now).getTime() + (issues - 1) * WEEK_MS);
}

export type ZineRunChoice = { kind: "keep" } | { kind: "none" } | { kind: "untilEvent" } | { kind: "issues"; issues: number };

/** Reads the "Lehdessä" select, accepting only the values the form offers. */
export function readZineRun(formData: FormData, allowed: readonly number[]): ZineRunChoice {
  const raw = String(formData.get("zineRun") ?? "keep");
  if (raw === "none" || raw === "keep" || raw === "untilEvent") return { kind: raw };
  const issues = Number(raw);
  if (!allowed.includes(issues)) throw new Error("Valitse, kuinka monessa lehdessä juttu on.");
  return { kind: "issues", issues };
}
