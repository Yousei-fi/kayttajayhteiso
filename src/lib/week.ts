const DAY_MS = 24 * 60 * 60 * 1000;

function atMidnight(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function mondayOfWeek(date: Date): Date {
  const d = atMidnight(date);
  const weekday = d.getDay() === 0 ? 7 : d.getDay(); // Mon=1 ... Sun=7
  d.setDate(d.getDate() - (weekday - 1));
  return d;
}

/**
 * The Monday-Sunday period that the next zine edition covers. On Sunday we
 * prepare the edition for the week starting the following day, and this
 * formula (this week's Monday + 7 days) yields that same period on every
 * other weekday too, so a single upcoming DRAFT edition can be found or
 * created consistently no matter when someone opens the app.
 */
export function upcomingEditionRange(reference: Date = new Date()): {
  startDate: Date;
  endDate: Date;
} {
  const startDate = mondayOfWeek(reference);
  startDate.setDate(startDate.getDate() + 7);
  const endDate = new Date(startDate.getTime() + 6 * DAY_MS);
  return { startDate, endDate };
}

/**
 * The start of the window an edition draws its articles from: one calendar
 * month back from the edition's own start. Alerts are week-scoped because
 * they are time-critical, but articles are written at a much slower pace,
 * so a week's worth of them would leave most issues with nothing to read —
 * a month-long window keeps every issue stocked, and an article simply
 * ages out of the zine a month after it was written.
 */
export function articleWindowStart(editionStart: Date): Date {
  const start = atMidnight(editionStart);
  start.setMonth(start.getMonth() - 1);
  return start;
}

const FI_DATE = new Intl.DateTimeFormat("fi-FI", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

export function formatDate(date: Date | string): string {
  return FI_DATE.format(new Date(date));
}

const FI_DATETIME = new Intl.DateTimeFormat("fi-FI", {
  weekday: "short",
  day: "numeric",
  month: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const FI_TIME = new Intl.DateTimeFormat("fi-FI", { hour: "2-digit", minute: "2-digit" });

/** "ma 21.9. klo 18.00" — the form community events are announced in. */
export function formatDateTime(date: Date | string): string {
  return FI_DATETIME.format(new Date(date));
}

export function formatTime(date: Date | string): string {
  return FI_TIME.format(new Date(date));
}

/** The value a datetime-local input expects, in local (not UTC) time. */
export function toDateTimeLocalValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

/**
 * Finnish month names in the genitive, for headings that read as a phrase
 * ("Syyskuun luettavaa"). Intl gives nominative forms only, so these are
 * spelled out.
 */
const FI_MONTHS_GENITIVE = [
  "tammikuun",
  "helmikuun",
  "maaliskuun",
  "huhtikuun",
  "toukokuun",
  "kesäkuun",
  "heinäkuun",
  "elokuun",
  "syyskuun",
  "lokakuun",
  "marraskuun",
  "joulukuun",
];

export function monthGenitive(date: Date | string): string {
  return FI_MONTHS_GENITIVE[new Date(date).getMonth()];
}

export function formatDateRange(start: Date | string, end: Date | string): string {
  const s = new Date(start);
  const e = new Date(end);
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (sameMonth) {
    return `${s.getDate()}.–${e.getDate()}.${e.getMonth() + 1}.${e.getFullYear()}`;
  }
  return `${formatDate(s)}–${formatDate(e)}`;
}
