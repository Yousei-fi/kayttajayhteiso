import Link from "next/link";
import { requireAreaUser } from "@/lib/auth";
import { formatDate } from "@/lib/week";

export default async function KierroksetPage() {
  const { user, db } = await requireAreaUser("MEMBER", "ADMIN", "SERVICE");

  const rounds = await db.streetRound.findMany({
    orderBy: { date: "desc" },
    include: { author: true },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Katukierrokset</h1>
        {(user.role === "MEMBER" || user.role === "ADMIN") && (
          <Link
            href="/dashboard/kierrokset/uusi"
            className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white"
          >
            Kirjaa katukierros
          </Link>
        )}
      </div>

      <p className="mb-4 text-xs text-muted">
        Sisäistä tietoa jäsenille ja palveluille. Ei julkaista lehdessä eikä julkisella sivustolla.
      </p>

      <ul className="flex flex-col gap-2">
        {rounds.map((r) => (
          <li key={r.id} className="rounded border border-line bg-paper p-3">
            <Link href={`/dashboard/kierrokset/${r.id}`} className="font-semibold hover:underline">
              {formatDate(r.date)} {r.place ? `– ${r.place}` : ""}
            </Link>
            <p className="text-xs text-muted">{r.author.name}</p>
            <p className="mt-1 line-clamp-2 text-sm">{r.notes}</p>
          </li>
        ))}
        {rounds.length === 0 && <p className="text-sm text-muted">Ei vielä kierroksia.</p>}
      </ul>
    </div>
  );
}
