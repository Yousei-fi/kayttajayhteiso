import { prisma } from "@/lib/db";
import { formatDateTime, formatTime } from "@/lib/week";

export default async function JulkisetTapahtumatPage() {
  const now = new Date();

  // Anything that has not finished yet is still worth showing: an event that
  // started this morning and runs all day should not vanish at noon.
  const events = await prisma.communityEvent.findMany({
    where: { OR: [{ endsAt: { gte: now } }, { endsAt: null, startsAt: { gte: now } }] },
    orderBy: { startsAt: "asc" },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Käyttäjäyhteisön kokoukset ja tapahtumat</h1>
      <p className="mb-6 text-sm text-muted">
        Yhteisön omat kokoukset ja tapahtumat. Kaikki ovat tervetulleita, ellei kuvauksessa toisin sanota.
      </p>

      <ul className="flex flex-col gap-3">
        {events.map((e) => (
          <li key={e.id} className="rounded-lg border border-line bg-paper p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-2">
              {formatDateTime(e.startsAt)}
              {e.endsAt ? `–${formatTime(e.endsAt)}` : ""}
            </p>
            <h2 className="mt-1 text-lg font-bold">{e.title}</h2>
            {e.location && <p className="text-sm text-muted">{e.location}</p>}
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{e.body}</p>
          </li>
        ))}
        {events.length === 0 && (
          <p className="text-sm text-muted">Ei tulevia tapahtumia juuri nyt. Katso myöhemmin uudelleen.</p>
        )}
      </ul>
    </main>
  );
}
