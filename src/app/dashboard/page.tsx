import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSyncedUpcomingEdition } from "@/lib/zine";
import { formatDate, formatDateRange } from "@/lib/week";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/kirjaudu");

  const edition = await getSyncedUpcomingEdition();

  const [latestAlerts, latestRounds] = await Promise.all([
    prisma.alert.findMany({
      where: { archived: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { service: true },
    }),
    prisma.streetRound.findMany({
      orderBy: { date: "desc" },
      take: 5,
      include: { author: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      {user.role === "ADMIN" && (
        <section className="rounded border border-accent/40 bg-accent/5 p-4">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-accent">
            Ylläpito
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/admin/viikkolehti" className="underline">Viikkolehdet</Link>
            <Link href="/admin/kayttajat" className="underline">Käyttäjät</Link>
            <Link href="/admin/kokemukset" className="underline">Kokemukset</Link>
            <Link href="/admin/asetukset" className="underline">Asetukset</Link>
          </div>
        </section>
      )}

      <section className="rounded border border-line bg-paper p-4">
        <p className="text-xs uppercase tracking-wide text-muted">Tuleva lehti</p>
        <p className="text-xl font-bold">{formatDateRange(edition.startDate, edition.endDate)}</p>
        <Link
          href="/dashboard/viikkolehti"
          className="mt-2 inline-block rounded bg-accent-2 px-3 py-1.5 text-sm font-semibold text-white"
        >
          Esikatsele
        </Link>
      </section>

      {user.role === "SERVICE" ? (
        <>
          <BigButton href="/dashboard/ilmoitukset/uusi" label="Tee ilmoitus" />
          <div className="grid gap-4 sm:grid-cols-2">
            <LinkCard href="/dashboard/ilmoitukset" label="Omat ilmoitukset" />
            <LinkCard href="/dashboard/ilmoitukset?muut=1" label="Muiden palveluiden ilmoitukset" />
            <LinkCard href="/dashboard/kierrokset" label="Katukierrosten havainnot" />
            <LinkCard href="/dashboard/viikkolehti" label="Tuleva viikkolehti" />
          </div>
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <BigButton href="/dashboard/artikkelit/uusi" label="Kirjoita artikkeli" />
          <BigButton href="/dashboard/kierrokset/uusi" label="Kirjaa katukierros" />
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">Uusimmat palveluilmoitukset</h2>
        <ul className="flex flex-col gap-2">
          {latestAlerts.length === 0 && <p className="text-sm text-muted">Ei ilmoituksia.</p>}
          {latestAlerts.map((a) => (
            <li key={a.id} className="rounded border border-line bg-paper p-3">
              <p className="text-xs uppercase tracking-wide text-accent-2">
                {a.service.serviceName || a.service.name}
              </p>
              <p className="font-semibold">{a.title}</p>
              <p className="text-xs text-muted">{formatDate(a.createdAt)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Viimeisimmät katukierrokset</h2>
        <ul className="flex flex-col gap-2">
          {latestRounds.length === 0 && <p className="text-sm text-muted">Ei vielä kierroksia.</p>}
          {latestRounds.map((r) => (
            <li key={r.id} className="rounded border border-line bg-paper p-3">
              <Link href={`/dashboard/kierrokset/${r.id}`} className="font-semibold hover:underline">
                {formatDate(r.date)} {r.area ? `– ${r.area}` : ""}
              </Link>
              <p className="text-xs text-muted">{r.author.name}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function BigButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center rounded-lg bg-accent px-6 py-6 text-center text-lg font-bold text-white shadow-sm hover:opacity-90"
    >
      {label}
    </Link>
  );
}

function LinkCard({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded border border-line bg-paper px-4 py-4 font-semibold hover:border-accent-2"
    >
      {label}
    </Link>
  );
}
