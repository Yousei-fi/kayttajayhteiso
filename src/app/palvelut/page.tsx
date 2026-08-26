import Link from "next/link";
import { prisma } from "@/lib/db";
import { ServiceMap } from "@/components/service-map";
import { formatDate } from "@/lib/week";

export default async function PalvelutPage({
  searchParams,
}: {
  searchParams: Promise<{ kategoria?: string }>;
}) {
  const { kategoria } = await searchParams;

  const [services, categoriesRaw, latestExperiences] = await Promise.all([
    prisma.directoryService.findMany({
      where: kategoria ? { category: kategoria } : undefined,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.directoryService.findMany({
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
    prisma.experience.findMany({
      where: { serviceId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { service: { select: { id: true, name: true } } },
    }),
  ]);

  const categories = categoriesRaw.map((c) => c.category);
  const pins = services
    .filter((s) => s.lat != null && s.lng != null)
    .map((s) => ({ id: s.id, name: s.name, lat: s.lat!, lng: s.lng!, subtitle: s.category }));

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Tampereen palvelut</h1>
      <p className="mb-6 text-sm text-muted">
        Kokoamme tähän Tampereen päihde- ja mielenterveyspalveluita, järjestöjä ja vertaistukea. Tämä ei ole
        kattava hakemisto — täydennämme sitä sitä mukaa kun tietoa kertyy. Kartalla näkyvät palvelut, joiden
        osoite on tiedossa.
      </p>

      {pins.length > 0 && (
        <div className="mb-8">
          <ServiceMap pins={pins} basePath="/palvelut" />
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2 text-xs">
        <Link
          href="/palvelut"
          className={`rounded-full border px-3 py-1 ${!kategoria ? "border-accent bg-accent text-white" : "border-line"}`}
        >
          Kaikki
        </Link>
        {categories.map((c) => (
          <Link
            key={c}
            href={`/palvelut?kategoria=${encodeURIComponent(c)}`}
            className={`rounded-full border px-3 py-1 ${kategoria === c ? "border-accent bg-accent text-white" : "border-line"}`}
          >
            {c}
          </Link>
        ))}
      </div>

      <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
        <ul className="flex flex-col gap-2">
          {services.map((s) => (
            <li key={s.id} className="rounded border border-line bg-paper p-3">
              <Link href={`/palvelut/${s.id}`} className="font-semibold hover:underline">
                {s.name}
              </Link>
              <p className="text-xs uppercase tracking-wide text-accent-2">{s.category}</p>
              {s.address && <p className="text-xs text-muted">{s.address}</p>}
              {s.description && <p className="mt-1 line-clamp-2 text-sm">{s.description}</p>}
            </li>
          ))}
          {services.length === 0 && <p className="text-sm text-muted">Ei palveluita tässä kategoriassa.</p>}
        </ul>

        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Uusimmat kokemukset</h2>
          <ul className="flex flex-col gap-3">
            {latestExperiences.map((e) => (
              <li key={e.id} className="rounded border border-line bg-paper p-3 text-sm">
                <p>{e.body}</p>
                <p className="mt-1 text-xs text-muted">
                  {e.service && (
                    <Link href={`/palvelut/${e.service.id}`} className="text-accent-2 hover:underline">
                      {e.service.name}
                    </Link>
                  )}{" "}
                  · {formatDate(e.createdAt)}
                </p>
              </li>
            ))}
            {latestExperiences.length === 0 && (
              <p className="text-sm text-muted">Ei vielä kokemuksia.</p>
            )}
          </ul>
        </div>
      </div>
    </main>
  );
}
