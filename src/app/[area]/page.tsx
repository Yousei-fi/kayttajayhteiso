import Link from "next/link";
import { areaDb } from "@/lib/db";
import { areaOrgName, areaPath, requireArea } from "@/lib/area";
import { formatDateRange, formatDateTime } from "@/lib/week";
import { getUpcomingMeetings } from "@/lib/na-meetings";
import { renderMarkdown } from "@/lib/markdown";
import { ZINE_NAME } from "@/lib/zine-brand";
import { CandleMark } from "@/components/icons";
import { ContactCards } from "@/components/contact-cards";

export default async function AreaHomePage({ params }: PageProps<"/[area]">) {
  const area = await requireArea((await params).area);
  const db = areaDb(area.id);
  const now = new Date();

  const [alerts, edition, events, meetings] = await Promise.all([
    db.alert.findMany({
      where: { archived: false, OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { service: true },
    }),
    db.zineEdition.findFirst({ where: { status: "FINAL" }, orderBy: { startDate: "desc" } }),
    db.communityEvent.findMany({
      where: { OR: [{ endsAt: { gte: now } }, { endsAt: null, startsAt: { gte: now } }] },
      orderBy: { startsAt: "asc" },
      take: 3,
    }),
    db.naMeeting.findMany({ where: { cancelled: false } }),
  ]);
  const nextMeetings = getUpcomingMeetings(meetings, 3, now);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <section className="mb-10 rounded-lg border border-line bg-paper p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-2">{areaOrgName(area)}</p>
        <h1 className="mt-1 text-3xl font-bold">{area.name}</h1>
        {area.aboutText ? (
          <div
            className="prose-content mt-2 text-sm"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(area.aboutText) }}
          />
        ) : (
          <p className="mt-2 text-sm text-muted">
            {area.nameGenitive} päihde- ja mielenterveyspalvelut, NA-ryhmät, yhteisön tapahtumat ja oma
            lehtemme <strong>{ZINE_NAME}</strong>.
          </p>
        )}
        {edition && (
          <Link
            href={areaPath(area, "/lehti")}
            className="mt-4 inline-block rounded bg-accent px-4 py-2 font-semibold text-white"
          >
            <CandleMark className="mr-2 inline-block h-5 w-auto align-text-bottom" />
            Lue uusin {ZINE_NAME} ({formatDateRange(edition.startDate, edition.endDate)})
          </Link>
        )}
      </section>

      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Ajankohtaiset palveluilmoitukset</h2>
          <Link href={areaPath(area, "/ilmoitukset")} className="text-sm text-accent-2 underline">
            Kaikki ilmoitukset
          </Link>
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
          <h2 className="text-lg font-bold">Käyttäjäyhteisön kokoukset ja tapahtumat</h2>
          <Link href={areaPath(area, "/tapahtumat")} className="text-sm text-accent-2 underline">
            Kaikki tapahtumat
          </Link>
        </div>
        <ul className="flex flex-col gap-2">
          {events.map((e) => (
            <li key={e.id} className="rounded border border-line bg-paper p-3">
              <p className="text-xs uppercase tracking-wide text-accent-2">{formatDateTime(e.startsAt)}</p>
              <p className="font-semibold">{e.title}</p>
              {e.location && <p className="text-xs text-muted">{e.location}</p>}
            </li>
          ))}
          {events.length === 0 && <p className="text-sm text-muted">Ei tulevia tapahtumia juuri nyt.</p>}
        </ul>
      </section>

      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Seuraavat NA-kokoukset</h2>
          <Link href={areaPath(area, "/na-ryhmat")} className="text-sm text-accent-2 underline">
            Kaikki NA-ryhmät
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {nextMeetings.map((m) => (
            <Link
              key={m.id}
              href={areaPath(area, `/na-ryhmat/${m.id}`)}
              className="rounded border border-line bg-paper p-3 hover:border-accent-2"
            >
              <p className="text-xs uppercase tracking-wide text-accent-2">
                {m.weekday} klo {m.time}
              </p>
              <p className="font-semibold">{m.name}</p>
              {m.address && <p className="text-xs text-muted">{m.address}</p>}
            </Link>
          ))}
          {nextMeetings.length === 0 && <p className="text-sm text-muted">Ei tulevia kokouksia tiedossa.</p>}
        </div>
      </section>

      <section className="mb-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-paper p-6">
          <h2 className="text-xl font-bold">{area.nameGenitive} palvelut</h2>
          <p className="mt-2 text-sm text-muted">
            Alueen päihde- ja mielenterveyspalvelut, järjestöt ja vertaistuki kartalla, sekä muiden
            jättämiä kokemuksia.
          </p>
          <Link href={areaPath(area, "/palvelut")} className="mt-3 inline-block text-sm text-accent-2 underline">
            Avaa palvelut
          </Link>
        </div>
        <div className="rounded-lg border border-line bg-paper p-6">
          <h2 className="text-xl font-bold">{area.nameGenitive} NA-ryhmät</h2>
          <p className="mt-2 text-sm text-muted">
            Nimettömien Narkomaanien vertaistukiryhmät {area.nameInessive} kartalla, seuraavat kokoukset ja
            ryhmien tiedot.
          </p>
          <Link href={areaPath(area, "/na-ryhmat")} className="mt-3 inline-block text-sm text-accent-2 underline">
            Avaa NA-ryhmät
          </Link>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold">Ota yhteyttä</h2>
        <ContactCards email={area.contactInfo} telegram={area.socialInfo} />
      </section>

      <section>
        <Link href={areaPath(area, "/lehti/arkisto")} className="text-sm text-accent-2 underline">
          Selaa aiempia lehtiä
        </Link>
      </section>
    </main>
  );
}
