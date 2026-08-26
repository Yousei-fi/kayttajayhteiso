import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate, formatDateRange } from "@/lib/week";

export default async function HomePage() {
  const now = new Date();

  const [alerts, articles, edition] = await Promise.all([
    prisma.alert.findMany({
      where: { archived: false, OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { service: true },
    }),
    prisma.article.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { author: true },
    }),
    prisma.zineEdition.findFirst({ where: { status: "FINAL" }, orderBy: { startDate: "desc" } }),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <section className="mb-10 rounded-lg border border-line bg-paper p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-2">Tampereen Käyttäjäyhteisö</p>
        <h1 className="mt-1 text-3xl font-bold">Ilmoituksia, artikkeleita ja viikkolehti</h1>
        <p className="mt-2 text-sm text-muted">
          Kokoamme tähän Tampereen päihdepalveluiden ajankohtaiset ilmoitukset ja yhteisömme kirjoituksia.
          Painettu viikkolehti kootaan näistä joka viikko.
        </p>
        {edition && (
          <Link
            href="/viikkolehti"
            className="mt-4 inline-block rounded bg-accent px-4 py-2 font-semibold text-white"
          >
            Lue tämän viikon lehti ({formatDateRange(edition.startDate, edition.endDate)})
          </Link>
        )}
      </section>

      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Ajankohtaiset palveluilmoitukset</h2>
          <Link href="/ilmoitukset" className="text-sm text-accent-2 underline">Kaikki ilmoitukset</Link>
        </div>
        <ul className="flex flex-col gap-2">
          {alerts.map((a) => (
            <li key={a.id} className="rounded border border-line bg-paper p-3">
              <p className="text-xs uppercase tracking-wide text-accent-2">{a.service.serviceName || a.service.name}</p>
              <p className="font-semibold">{a.title}</p>
              <p className="text-sm">{a.body}</p>
            </li>
          ))}
          {alerts.length === 0 && <p className="text-sm text-muted">Ei ajankohtaisia ilmoituksia juuri nyt.</p>}
        </ul>
      </section>

      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Uusimmat artikkelit</h2>
          <Link href="/artikkelit" className="text-sm text-accent-2 underline">Kaikki artikkelit</Link>
        </div>
        <ul className="flex flex-col gap-2">
          {articles.map((a) => (
            <li key={a.id} className="rounded border border-line bg-paper p-3">
              <Link href={`/artikkelit/${a.id}`} className="font-semibold hover:underline">{a.title}</Link>
              <p className="text-xs text-muted">{a.author.name} · {formatDate(a.createdAt)}</p>
            </li>
          ))}
          {articles.length === 0 && <p className="text-sm text-muted">Ei vielä julkaistuja artikkeleita.</p>}
        </ul>
      </section>

      <section className="mb-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-paper p-6">
          <h2 className="text-xl font-bold">Tampereen palvelut</h2>
          <p className="mt-2 text-sm text-muted">
            Selaa Tampereen päihde- ja mielenterveyspalveluita, katso niiden sijainnit kartalla ja lue
            muiden jättämiä kokemuksia.
          </p>
          <Link href="/palvelut" className="mt-3 inline-block text-sm text-accent-2 underline">
            Avaa Tampereen palvelut
          </Link>
        </div>
        <div className="rounded-lg border border-line bg-paper p-6">
          <h2 className="text-xl font-bold">Tampereen NA-ryhmät</h2>
          <p className="mt-2 text-sm text-muted">
            Nimettömien Narkomaanien vertaistukiryhmät Tampereella kartalla, seuraavat kokoukset ja
            kokemuksia ryhmistä.
          </p>
          <Link href="/na-ryhmat" className="mt-3 inline-block text-sm text-accent-2 underline">
            Avaa Tampereen NA-ryhmät
          </Link>
        </div>
      </section>

      <section>
        <Link href="/viikkolehti/arkisto" className="text-sm text-accent-2 underline">
          Selaa aiempia viikkolehtiä
        </Link>
      </section>
    </main>
  );
}
