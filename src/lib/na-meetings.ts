import type { Area, NaMeeting } from "@prisma/client";

const WEEKDAY_ORDER = [
  "Maanantai",
  "Tiistai",
  "Keskiviikko",
  "Torstai",
  "Perjantai",
  "Lauantai",
  "Sunnuntai",
];

export function weekdayName(index: number): string {
  return WEEKDAY_ORDER[index - 1] ?? "";
}

export function isOnBreak(meeting: Pick<NaMeeting, "onBreakUntil">, reference: Date = new Date()): boolean {
  return !!meeting.onBreakUntil && meeting.onBreakUntil > reference;
}

/**
 * Meetings are weekly-recurring (weekdayIndex 1=Monday..7=Sunday + a
 * time-of-day), not single dated events, so "next 3 meetings" has to be
 * computed relative to now rather than read off a date column.
 */
export function getUpcomingMeetings(
  meetings: NaMeeting[],
  count: number,
  reference: Date = new Date(),
): NaMeeting[] {
  const currentWeekday = reference.getDay() === 0 ? 7 : reference.getDay();
  const currentMinutes = reference.getHours() * 60 + reference.getMinutes();

  const active = meetings.filter((m) => !m.cancelled && !isOnBreak(m, reference));

  const withOffset = active.map((m) => {
    const [h, min] = m.time.split(":").map(Number);
    const meetingMinutes = h * 60 + min;
    let dayDiff = (m.weekdayIndex - currentWeekday + 7) % 7;
    if (dayDiff === 0 && meetingMinutes <= currentMinutes) {
      dayDiff = 7;
    }
    const minutesUntil = dayDiff * 1440 + meetingMinutes - currentMinutes;
    return { meeting: m, minutesUntil };
  });

  withOffset.sort((a, b) => a.minutesUntil - b.minutesUntil);
  return withOffset.slice(0, count).map((w) => w.meeting);
}

/**
 * The public introduction to NA, shown both on /<area>/na-ryhmat and at the
 * head of the paper's "<Area> NA-ryhmät" section. Kept here as a single
 * source so the printed and the online wording cannot drift apart.
 */
export function naIntroParagraphs(area: Pick<Area, "nameInessive">): string[] {
  return [
    "Nimettömät Narkomaanit on pitkäikäinen kansainvälinen yhteisö joka tarjoaa vertaistukea huumeidenkäyttäjille jotka pyrkivät päihteettömään elämään.",
    `NA (Narcotics Anonymous) ryhmiä on myös paljon ${area.nameInessive} ja jokainen joka kokee käyttönsä olevan ongelma on tervetullut käymään ryhmissä ja lähteä saa yhtä vapaasti.`,
    "Yleensä ryhmissä toivotaan että ei puhuisi ryhmän ollessa käynnissä jos on päihtyneenä, mutta paikalle saa tulla ja jutella muiden kanssa ennen ryhmää ja sen jälkeen.",
  ];
}
