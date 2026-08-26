import Link from "next/link";
import { prisma } from "@/lib/db";
import { ServiceMap } from "@/components/service-map";
import { formatDate } from "@/lib/week";
import { getUpcomingMeetings, isOnBreak } from "@/lib/na-meetings";

const WEEKDAYS = ["Maanantai", "Tiistai", "Keskiviikko", "Torstai", "Perjantai", "Lauantai", "Sunnuntai"];

export default async function NaRyhmatPage({
  searchParams,
}: {
  searchParams: Promise<{ viikonpaiva?: string }>;
}) {
  const { viikonpaiva } = await searchParams;

  const [meetings, latestExperiences] = await Promise.all([
    prisma.naMeeting.findMany({
      where: { cancelled: false },
      orderBy: [{ weekdayIndex: "asc" }, { time: "asc" }],
    }),
    prisma.experience.findMany({
      where: { meetingId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { meeting: { select: { id: true, name: true } } },
    }),
  ]);

  const upcoming = getUpcomingMeetings(meetings, 3);
  const filtered = viikonpaiva ? meetings.filter((m) => m.weekday === viikonpaiva) : meetings;
  const pins = meetings
    .filter((m) => m.lat != null && m.lng != null)
    .map((m) => ({
      id: m.id,
      name: m.name,
      lat: m.lat!,
      lng: m.lng!,
      subtitle: `${m.weekday} klo ${m.time}`,
    }));

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">Tampereen NA-ryhmät</h1>

      <div className="mb-8 rounded-lg border border-line bg-paper p-4 text-sm leading-relaxed">
        <p className="mb-2">
          Nimettömät Narkomaanit on pitkäikäinen kansainvälinen yhteisö joka tarjoaa vertaistukea
          huumeidenkäyttäjille jotka pyrkivät päihteettömään elämään.
        </p>
        <p className="mb-2">
          NA (Narcotics Anonymous) ryhmiä on myös paljon Tampereella ja jokainen joka kokee käyttönsä olevan
          ongelma on tervetullut käymään ryhmissä ja lähteä saa yhtä vapaasti.
        </p>
        <p>
          Yleensä ryhmissä toivotaan että ei puhuisi ryhmän ollessa käynnissä jos on päihtyneenä, mutta
          paikalle saa tulla ja jutella muiden kanssa ennen ryhmää ja sen jälkeen.
        </p>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Seuraavat 3 kokousta</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {upcoming.map((m) => (
            <Link
              key={m.id}
              href={`/na-ryhmat/${m.id}`}
              className="rounded border border-accent-2 bg-paper p-3 hover:border-accent"
            >
              <p className="text-xs uppercase tracking-wide text-accent-2">
                {m.weekday} klo {m.time}
              </p>
              <p className="font-semibold">{m.name}</p>
              {m.address && <p className="text-xs text-muted">{m.address}</p>}
            </Link>
          ))}
          {upcoming.length === 0 && <p className="text-sm text-muted">Ei tulevia kokouksia tiedossa.</p>}
        </div>
      </section>

      {pins.length > 0 && (
        <div className="mb-8">
          <ServiceMap pins={pins} basePath="/na-ryhmat" />
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2 text-xs">
        <Link
          href="/na-ryhmat"
          className={`rounded-full border px-3 py-1 ${!viikonpaiva ? "border-accent bg-accent text-white" : "border-line"}`}
        >
          Kaikki
        </Link>
        {WEEKDAYS.map((w) => (
          <Link
            key={w}
            href={`/na-ryhmat?viikonpaiva=${encodeURIComponent(w)}`}
            className={`rounded-full border px-3 py-1 ${viikonpaiva === w ? "border-accent bg-accent text-white" : "border-line"}`}
          >
            {w}
          </Link>
        ))}
      </div>

      <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
        <ul className="flex flex-col gap-2">
          {filtered.map((m) => (
            <li key={m.id} className="rounded border border-line bg-paper p-3">
              <Link href={`/na-ryhmat/${m.id}`} className="font-semibold hover:underline">
                {m.name}
              </Link>
              <p className="text-xs uppercase tracking-wide text-accent-2">
                {m.weekday} klo {m.time}
                {m.durationMinutes ? ` · ${m.durationMinutes} min` : ""}
              </p>
              {m.address && <p className="text-xs text-muted">{m.address}</p>}
              {isOnBreak(m) && (
                <p className="mt-1 text-xs font-semibold text-danger">
                  Tauolla {formatDate(m.onBreakUntil!)} asti
                </p>
              )}
            </li>
          ))}
          {filtered.length === 0 && <p className="text-sm text-muted">Ei kokouksia tällä viikonpäivällä.</p>}
        </ul>

        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Uusimmat kokemukset</h2>
          <ul className="flex flex-col gap-3">
            {latestExperiences.map((e) => (
              <li key={e.id} className="rounded border border-line bg-paper p-3 text-sm">
                <p>{e.body}</p>
                <p className="mt-1 text-xs text-muted">
                  {e.meeting && (
                    <Link href={`/na-ryhmat/${e.meeting.id}`} className="text-accent-2 hover:underline">
                      {e.meeting.name}
                    </Link>
                  )}{" "}
                  · {formatDate(e.createdAt)}
                </p>
              </li>
            ))}
            {latestExperiences.length === 0 && <p className="text-sm text-muted">Ei vielä kokemuksia.</p>}
          </ul>
        </div>
      </div>
    </main>
  );
}

