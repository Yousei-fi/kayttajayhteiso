import Link from "next/link";
import { prisma } from "@/lib/db";
import { areaPath, getActiveAreas, getRememberedArea } from "@/lib/area";
import { getSiteSettings } from "@/lib/settings";
import { formatDate, formatDateRange } from "@/lib/week";
import { ZINE_NAME } from "@/lib/zine-brand";
import { CandleMark } from "@/components/icons";

/**
 * The national front page: what every area shares (articles), and a way into
 * each area. The visitor's last area, if any, leads.
 */
export default async function HomePage() {
  const [settings, areas, remembered, articles] = await Promise.all([
    getSiteSettings(),
    getActiveAreas(),
    getRememberedArea(),
    prisma.article.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { author: true },
    }),
  ]);

  const editions = await Promise.all(
    areas.map((area) =>
      prisma.zineEdition.findFirst({
        where: { areaId: area.id, status: "FINAL" },
        orderBy: { startDate: "desc" },
      }),
    ),
  );
  const ordered = remembered ? [remembered, ...areas.filter((a) => a.id !== remembered.id)] : areas;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <section className="mb-10 rounded-lg border border-line bg-paper p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-2">{settings.orgName}</p>
        <h1 className="mt-1 text-3xl font-bold">Palvelut, vertaistuki ja oma lehti</h1>
        <p className="mt-2 text-sm text-muted">
          {settings.description ||
            "Kokoamme päihdepalveluiden ajankohtaiset ilmoitukset, palvelut, NA-ryhmät ja yhteisömme kirjoituksia. Jokainen alue tekee niistä oman painetun lehtensä."}
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold">Valitse alue</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {ordered.map((area) => (
            <Link
              key={area.id}
              href={areaPath(area)}
              className={`rounded-lg border bg-paper p-4 hover:border-accent ${
                area.id === remembered?.id ? "border-accent" : "border-line"
              }`}
            >
              {area.id === remembered?.id && (
                <p className="text-xs uppercase tracking-wide text-accent">Viimeksi valittu</p>
              )}
              <p className="text-lg font-bold">{area.name}</p>
              <p className="text-xs text-muted">Palvelut, NA-ryhmät, tapahtumat ja lehti</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Uusimmat artikkelit</h2>
          <Link href="/artikkelit" className="text-sm text-accent-2 underline">
            Kaikki artikkelit
          </Link>
        </div>
        <ul className="flex flex-col gap-2">
          {articles.map((a) => (
            <li key={a.id} className="rounded border border-line bg-paper p-3">
              <Link href={`/artikkelit/${a.id}`} className="font-semibold hover:underline">
                {a.title}
              </Link>
              <p className="text-xs text-muted">
                {a.author.name} · {formatDate(a.createdAt)}
              </p>
            </li>
          ))}
          {articles.length === 0 && <p className="text-sm text-muted">Ei vielä julkaistuja artikkeleita.</p>}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">{ZINE_NAME}</h2>
        <ul className="flex flex-col gap-2">
          {areas.map((area, i) => {
            const edition = editions[i];
            return (
              <li key={area.id} className="flex items-center justify-between gap-3 rounded border border-line bg-paper p-3">
                <span className="flex items-center gap-2">
                  <CandleMark className="h-6 w-auto text-accent" />
                  <span>
                    <span className="font-semibold">{area.nameGenitive} lehti</span>
                    <span className="block text-xs text-muted">
                      {edition ? formatDateRange(edition.startDate, edition.endDate) : "Ei vielä julkaistu"}
                    </span>
                  </span>
                </span>
                {edition && (
                  <Link href={areaPath(area, "/lehti")} className="text-sm text-accent-2 underline">
                    Lue
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
