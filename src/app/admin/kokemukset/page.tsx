import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/week";
import { deleteExperience, banIp, unbanIp } from "./actions";
import Link from "next/link";

export default async function AdminKokemuksetPage() {
  await requireUser("ADMIN");

  const [experiences, bans] = await Promise.all([
    prisma.experience.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        service: { select: { id: true, name: true } },
        meeting: { select: { id: true, name: true } },
      },
    }),
    prisma.bannedIp.findMany({ orderBy: { bannedUntil: "desc" } }),
  ]);

  const now = new Date();

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="mb-1 text-xl font-bold">Kokemukset</h1>
        <p className="mb-4 text-sm text-muted">
          Anonyymit julkiset kokemukset Tampereen palveluista. Poista asiattomat tai tunnistetietoja
          sisältävät viestit, ja estä tarvittaessa lähettäjän IP-osoite. Listalla voi vielä näkyä vanhoja
          NA-ryhmiin liitettyjä kokemuksia — niitä ei enää voi jättää, mutta ne voi poistaa täältä.
        </p>
        <ul className="flex flex-col gap-2">
          {experiences.map((e) => {
            const target = e.service
              ? { href: `/palvelut/${e.service.id}`, label: e.service.name }
              : e.meeting
                ? { href: `/na-ryhmat/${e.meeting.id}`, label: e.meeting.name }
                : null;
            return (
              <li key={e.id} className="rounded border border-line bg-paper p-3">
                <p className="text-sm">{e.body}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <span>
                    {target && (
                      <Link href={target.href} className="text-accent-2 hover:underline">
                        {target.label}
                      </Link>
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
