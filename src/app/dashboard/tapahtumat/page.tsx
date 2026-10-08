import Link from "next/link";
import { requireAreaUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/week";

export default async function TapahtumatPage() {
  const { user, db } = await requireAreaUser("MEMBER", "ADMIN");

  const now = new Date();
  const events = await db.communityEvent.findMany({
    orderBy: { startsAt: "asc" },
    include: { author: true },
  });
  const upcoming = events.filter((e) => (e.endsAt ?? e.startsAt) >= now);
  const past = events.filter((e) => (e.endsAt ?? e.startsAt) < now).reverse();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Kokoukset ja tapahtumat</h1>
        <Link
          href="/dashboard/tapahtumat/uusi"
          className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white"
        >
          Lisää tapahtuma
        </Link>
      </div>

      <p className="mb-4 text-sm text-muted">
        Yhteisön omat kokoukset ja tapahtumat. Nämä näkyvät julkisella sivustolla ja tulevat lehteen heti
        yhteisön esittelysivun jälkeen.
      </p>

      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">Tulossa ({upcoming.length})</h2>
      <ul className="mb-8 flex flex-col gap-2">
        {upcoming.map((e) => (
          <li key={e.id} className="rounded border border-line bg-paper p-3">
            <Link href={`/dashboard/tapahtumat/${e.id}`} className="font-semibold hover:underline">
              {e.title}
            </Link>
            <p className="text-xs uppercase tracking-wide text-accent-2">
              {formatDateTime(e.startsAt)}
              {e.location ? ` · ${e.location}` : ""}
            </p>
            <p className="text-xs text-muted">
              {e.author.name}
              {e.includeInZine ? " · Lehteen" : " · Ei lehteen"}
              {e.authorId === user.id ? "" : " · toisen lisäämä"}
            </p>
          </li>
        ))}
        {upcoming.length === 0 && <p className="text-sm text-muted">Ei tulevia tapahtumia.</p>}
      </ul>

      {past.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">Menneet ({past.length})</h2>
          <ul className="flex flex-col gap-2">
            {past.map((e) => (
              <li key={e.id} className="rounded border border-line bg-paper p-3 opacity-70">
                <Link href={`/dashboard/tapahtumat/${e.id}`} className="font-semibold hover:underline">
                  {e.title}
                </Link>
                <p className="text-xs text-muted">{formatDateTime(e.startsAt)}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
