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

const FI_DATE = new Intl.DateTimeFormat("fi-FI", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

export function formatDate(date: Date | string): string {
  return FI_DATE.format(new Date(date));
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
