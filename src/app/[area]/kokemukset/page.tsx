import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { areaPath, requireArea } from "@/lib/area";
import { compareCategories } from "@/lib/directory";
import { ExperienceForm } from "@/components/experience-form";
import { ExperiencePost } from "@/components/experience-post";
import { addBoardExperience } from "./actions";

const PAGE_SIZE = 30;

export const metadata: Metadata = { title: "Kokemukset palveluista" };

function param(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Every experience posted about the area's services, newest first, as a
 * bulletin board: narrow it to one service or search the text, read it a
 * page at a time, and post your own at the top.
 */
export default async function KokemuksetPage({ params, searchParams }: PageProps<"/[area]/kokemukset">) {
  const area = await requireArea((await params).area);
  const sp = await searchParams;
  const palvelu = param(sp.palvelu);
  const haku = param(sp.haku).slice(0, 100);
  const sivu = Math.max(1, Number.parseInt(param(sp.sivu), 10) || 1);

  // Experience has no area of its own; it belongs to one through its service.
  const where: Prisma.ExperienceWhereInput = {
    service: { areaId: area.id },
    ...(palvelu ? { serviceId: palvelu } : {}),
    ...(haku ? { body: { contains: haku } } : {}),
  };

  const [services, total, posts] = await Promise.all([
    prisma.directoryService.findMany({
      where: { areaId: area.id },
      select: { id: true, name: true, category: true, _count: { select: { experiences: true } } },
    }),
    prisma.experience.count({ where }),
    prisma.experience.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (sivu - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { service: { select: { id: true, name: true, category: true } } },
    }),
  ]);

  const sorted = [...services].sort(
    (a, b) => compareCategories(a.category, b.category) || a.name.localeCompare(b.name, "fi"),
  );
  const selected = services.find((s) => s.id === palvelu);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const base = areaPath(area, "/kokemukset");
  const href = (page: number) => {
    const q = new URLSearchParams();
    if (palvelu) q.set("palvelu", palvelu);
    if (haku) q.set("haku", haku);
    if (page > 1) q.set("sivu", String(page));
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };
  const mostDiscussed = [...services]
    .filter((s) => s._count.experiences > 0)
    .sort((a, b) => b._count.experiences - a._count.experiences)
    .slice(0, 8);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Kokemukset {area.nameGenitive} palveluista</h1>
      <p className="mb-6 max-w-2xl text-sm text-muted">
        Vertaisten omin sanoin: miten palvelussa kohdeltiin, mitä sieltä sai ja mitä jäi puuttumaan. Lue ennen
        kuin lähdet, ja kerro oma kokemuksesi – nimettömästi, ilman kirjautumista. Kokemuksia tulostetaan myös
        lehteen.
      </p>
      <a href="#kerro" className="mb-6 inline-block rounded bg-accent px-4 py-2 text-sm font-semibold text-white md:hidden">
        Kerro oma kokemuksesi
      </a>

      <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <form
            method="get"
            action={base}
            className="grid gap-2 rounded border border-line bg-paper p-3 text-sm sm:grid-cols-[1fr_1fr_auto]"
          >
            <select name="palvelu" defaultValue={palvelu} className="min-w-0 rounded border border-line bg-paper p-2">
              <option value="">Kaikki palvelut</option>
              {sorted.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s._count.experiences})
                </option>
              ))}
            </select>
            <input
              type="search"
              name="haku"
              defaultValue={haku}
              placeholder="Hae tekstistä"
              className="min-w-0 rounded border border-line bg-paper p-2"
            />
            <button type="submit" className="rounded bg-accent-2 px-4 py-2 font-semibold text-white">
              Hae
            </button>
          </form>

          <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <p>
              <strong>{total}</strong> {total === 1 ? "kokemus" : "kokemusta"}
              {selected && (
                <>
                  {" "}
                  palvelusta <strong>{selected.name}</strong>
                </>
              )}
              {haku && <> hakusanalla ”{haku}”</>}
            </p>
            {(palvelu || haku) && (
              <Link href={base} className="text-accent-2 underline">
                Näytä kaikki
              </Link>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {posts.map((e) => (
              <ExperiencePost
                key={e.id}
                body={e.body}
                createdAt={e.createdAt}
                service={e.service}
                boardHref={e.service ? `${base}?palvelu=${e.service.id}` : undefined}
                serviceHref={e.service ? areaPath(area, `/palvelut/${e.service.id}`) : undefined}
              />
            ))}
            {posts.length === 0 && (
              <p className="text-sm text-muted">
                {palvelu || haku ? "Ei hakua vastaavia kokemuksia." : "Ei vielä kokemuksia. Ole ensimmäinen!"}
              </p>
            )}
          </div>

          {pages > 1 && (
            <nav className="flex items-center justify-between text-sm" aria-label="Sivut">
              {sivu > 1 ? (
                <Link href={href(sivu - 1)} className="text-accent-2 underline">
                  ← Uudemmat
                </Link>
              ) : (
                <span />
              )}
              <span className="text-muted">
                Sivu {Math.min(sivu, pages)} / {pages}
              </span>
              {sivu < pages ? (
                <Link href={href(sivu + 1)} className="text-accent-2 underline">
                  Vanhemmat →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </div>

        <aside className="flex flex-col gap-6">
          <section id="kerro" className="rounded-lg border-2 border-accent bg-paper p-4">
            <h2 className="mb-2 text-lg font-bold">Kerro oma kokemuksesi</h2>
            <ExperienceForm
              action={addBoardExperience.bind(null, area.id)}
              services={sorted.map(({ id, name, category }) => ({ id, name, category }))}
            />
          </section>

          {mostDiscussed.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">Eniten kokemuksia</h2>
              <ul className="flex flex-col gap-1 text-sm">
                {mostDiscussed.map((s) => (
                  <li key={s.id} className="flex justify-between gap-2">
                    <Link href={`${base}?palvelu=${s.id}`} className="hover:underline">
                      {s.name}
                    </Link>
                    <span className="text-muted">{s._count.experiences}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
