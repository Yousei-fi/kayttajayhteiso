import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getAllAreas, isNationalAdmin } from "@/lib/area";
import { formatDate } from "@/lib/week";
import { deleteExperience, banIp, unbanIp } from "./actions";
import Link from "next/link";

/**
 * One moderation queue for every area. A national admin sees all of it (and
 * can narrow it with ?alue=), an area admin only their own area's. IP bans
 * stay national: abuse from one address is abuse wherever it was posted.
 */
export default async function AdminKokemuksetPage({ searchParams }: PageProps<"/admin/kokemukset">) {
  const admin = await requireUser("ADMIN");
  const { alue } = await searchParams;
  const areaFilter = isNationalAdmin(admin) ? (typeof alue === "string" && alue ? alue : null) : admin.areaId;

  const [experiences, bans, areas] = await Promise.all([
    prisma.experience.findMany({
      where: areaFilter
        ? { OR: [{ service: { areaId: areaFilter } }, { meeting: { areaId: areaFilter } }] }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        service: { select: { id: true, name: true, areaId: true } },
        meeting: { select: { id: true, name: true, areaId: true } },
      },
    }),
    prisma.bannedIp.findMany({ orderBy: { bannedUntil: "desc" } }),
    getAllAreas(),
  ]);
  const areaName = (id: string) => areas.find((a) => a.id === id)?.name ?? id;

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
              href="/admin/kokemukset"
              className={`rounded-full border px-3 py-1 ${!areaFilter ? "border-accent bg-accent text-white" : "border-line"}`}
            >
              Kaikki alueet
            </Link>
            {areas.map((a) => (
              <Link
                key={a.id}
                href={`/admin/kokemukset?alue=${a.id}`}
                className={`rounded-full border px-3 py-1 ${areaFilter === a.id ? "border-accent bg-accent text-white" : "border-line"}`}
              >
                {a.name}
              </Link>
            ))}
          </div>
        )}
        <ul className="flex flex-col gap-2">
          {experiences.map((e) => {
            const target = e.service
              ? { href: `/${e.service.areaId}/palvelut/${e.service.id}`, label: e.service.name, areaId: e.service.areaId }
              : e.meeting
                ? { href: `/${e.meeting.areaId}/na-ryhmat/${e.meeting.id}`, label: e.meeting.name, areaId: e.meeting.areaId }
                : null;
            return (
              <li key={e.id} className="rounded border border-line bg-paper p-3">
                <p className="text-sm">{e.body}</p>
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
                    · {formatDate(e.createdAt)} · IP: {e.ipAddress ?? "tuntematon"}
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
