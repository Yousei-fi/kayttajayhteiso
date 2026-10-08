import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getAllAreas, isNationalAdmin } from "@/lib/area";
import { formatDate } from "@/lib/week";
import { deleteExperience, banIp, unbanIp } from "./actions";
import Link from "next/link";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 50;

/**
 * One moderation queue for every area. A national admin sees all of it (and
 * can narrow it with ?alue=), an area admin only their own area's. IP bans
 * stay national: abuse from one address is abuse wherever it was posted.
 */
export default async function AdminKokemuksetPage({ searchParams }: PageProps<"/admin/kokemukset">) {
  const admin = await requireUser("ADMIN");
  const { alue, haku: rawHaku, ip: rawIp, sivu: rawSivu } = await searchParams;
  const areaFilter = isNationalAdmin(admin) ? (typeof alue === "string" && alue ? alue : null) : admin.areaId;
  const haku = typeof rawHaku === "string" ? rawHaku.trim().slice(0, 100) : "";
  const ip = typeof rawIp === "string" ? rawIp.trim() : "";
  const sivu = Math.max(1, Number.parseInt(typeof rawSivu === "string" ? rawSivu : "", 10) || 1);

  const where: Prisma.ExperienceWhereInput = {
    ...(areaFilter ? { OR: [{ service: { areaId: areaFilter } }, { meeting: { areaId: areaFilter } }] } : {}),
    ...(haku ? { body: { contains: haku } } : {}),
    ...(ip ? { ipAddress: ip } : {}),
  };
  const query = (changes: Record<string, string | number | null>) => {
    const q = new URLSearchParams();
    const current: Record<string, string | number | null> = { alue: areaFilter && isNationalAdmin(admin) ? areaFilter : null, haku, ip, ...changes };
    for (const [k, v] of Object.entries(current)) if (v && !(k === "sivu" && v === 1)) q.set(k, String(v));
    const s = q.toString();
    return s ? `/admin/kokemukset?${s}` : "/admin/kokemukset";
  };

  const [experiences, total, bans, areas] = await Promise.all([
    prisma.experience.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (sivu - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        service: { select: { id: true, name: true, areaId: true } },
        meeting: { select: { id: true, name: true, areaId: true } },
      },
    }),
    prisma.experience.count({ where }),
    prisma.bannedIp.findMany({ orderBy: { bannedUntil: "desc" } }),
    getAllAreas(),
  ]);
  const areaName = (id: string) => areas.find((a) => a.id === id)?.name ?? id;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const now = new Date();

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="mb-1 text-xl font-bold">Kokemukset</h1>
        <p className="mb-4 text-sm text-muted">
          Anonyymit julkiset kokemukset alueiden palveluista. Poista asiattomat tai tunnistetietoja
          sisältävät viestit, ja estä tarvittaessa lähettäjän IP-osoite. Listalla voi vielä näkyä vanhoja
          NA-ryhmiin liitettyjä kokemuksia — niitä ei enää voi jättää, mutta ne voi poistaa täältä.
        </p>
        {isNationalAdmin(admin) && (
          <div className="mb-4 flex flex-wrap gap-2 text-xs">
            <Link
              href={query({ alue: null, sivu: null })}
              className={`rounded-full border px-3 py-1 ${!areaFilter ? "border-accent bg-accent text-white" : "border-line"}`}
            >
              Kaikki alueet
            </Link>
            {areas.map((a) => (
              <Link
                key={a.id}
                href={query({ alue: a.id, sivu: null })}
                className={`rounded-full border px-3 py-1 ${areaFilter === a.id ? "border-accent bg-accent text-white" : "border-line"}`}
              >
                {a.name}
              </Link>
            ))}
          </div>
        )}
        <form method="get" action="/admin/kokemukset" className="mb-3 flex flex-wrap gap-2 text-sm">
          {areaFilter && isNationalAdmin(admin) && <input type="hidden" name="alue" value={areaFilter} />}
          <input
            type="search"
            name="haku"
            defaultValue={haku}
            placeholder="Hae tekstistä"
            className="min-w-0 flex-1 rounded border border-line bg-paper p-2"
          />
          <input
            type="search"
            name="ip"
            defaultValue={ip}
            placeholder="IP-osoite"
            className="w-40 rounded border border-line bg-paper p-2"
          />
          <button type="submit" className="rounded bg-accent-2 px-4 py-2 font-semibold text-white">
            Hae
          </button>
        </form>
        <p className="mb-3 text-sm">
          <strong>{total}</strong> kokemusta
          {(haku || ip) && (
            <>
              {" "}
              ·{" "}
              <Link href={query({ haku: null, ip: null, sivu: null })} className="text-accent-2 underline">
                Tyhjennä haku
              </Link>
            </>
          )}
        </p>
        <ul className="flex flex-col gap-2">
          {experiences.map((e) => {
            const target = e.service
              ? { href: `/${e.service.areaId}/palvelut/${e.service.id}`, label: e.service.name, areaId: e.service.areaId }
              : e.meeting
                ? { href: `/${e.meeting.areaId}/na-ryhmat/${e.meeting.id}`, label: e.meeting.name, areaId: e.meeting.areaId }
                : null;
            return (
              <li key={e.id} className="rounded border border-line bg-paper p-3">
                <p className="whitespace-pre-line text-sm">{e.body}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <span>
                    {target && (
                      <>
                        {areaName(target.areaId)} ·{" "}
                        <Link href={target.href} className="text-accent-2 hover:underline">
                          {target.label}
                        </Link>
                      </>
                    )}{" "}
                    · {formatDate(e.createdAt)} · IP:{" "}
                    {e.ipAddress ? (
                      <Link href={query({ ip: e.ipAddress, sivu: null })} className="hover:underline" title="Kaikki tästä osoitteesta">
                        {e.ipAddress}
                      </Link>
                    ) : (
                      "tuntematon"
                    )}
                  </span>
                  <div className="flex items-center gap-3">
                    {e.ipAddress && (
                      <form action={banIp} className="flex items-center gap-1">
                        <input type="hidden" name="ipAddress" value={e.ipAddress} />
                        <select name="days" defaultValue="7" className="rounded border border-line bg-paper px-1 py-0.5 text-xs">
                          <option value="1">1 pv</option>
                          <option value="7">7 pv</option>
                          <option value="30">30 pv</option>
                        </select>
                        <button type="submit" className="text-danger underline">
                          Estä IP
                        </button>
                      </form>
                    )}
                    <form action={deleteExperience.bind(null, e.id)}>
                      <button type="submit" className="text-danger underline">
                        Poista
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
          {experiences.length === 0 && <p className="text-sm text-muted">Ei kokemuksia.</p>}
        </ul>
        {pages > 1 && (
          <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Sivut">
            {sivu > 1 ? (
              <Link href={query({ sivu: sivu - 1 })} className="text-accent-2 underline">
                ← Uudemmat
              </Link>
            ) : (
              <span />
            )}
            <span className="text-muted">
              Sivu {Math.min(sivu, pages)} / {pages}
            </span>
            {sivu < pages ? (
              <Link href={query({ sivu: sivu + 1 })} className="text-accent-2 underline">
                Vanhemmat →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>

      <div>
        <h2 className="mb-1 text-lg font-bold">Estetyt IP-osoitteet</h2>
        <p className="mb-4 text-sm text-muted">Estetty IP ei voi jättää uusia kokemuksia niin kauan kuin esto on voimassa.</p>
        <ul className="flex flex-col gap-2">
          {bans.map((b) => {
            const active = b.bannedUntil > now;
            return (
              <li key={b.id} className="flex items-center justify-between rounded border border-line bg-paper p-3 text-sm">
                <span>
                  <span className="font-mono">{b.ipAddress}</span> ·{" "}
                  {active ? `estetty ${formatDate(b.bannedUntil)} asti` : `esto päättyi ${formatDate(b.bannedUntil)}`}
                  {b.reason ? ` · ${b.reason}` : ""}
                </span>
                <form action={unbanIp.bind(null, b.id)}>
                  <button type="submit" className="text-xs text-accent-2 underline">
                    Poista esto
                  </button>
                </form>
              </li>
            );
          })}
          {bans.length === 0 && <p className="text-sm text-muted">Ei estettyjä IP-osoitteita.</p>}
        </ul>
      </div>
    </div>
  );
}
