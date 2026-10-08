/**
 * Syncs real reference data (each area's service directory and NA meetings)
 * from the JSON files under prisma/data/<area>/ that
 * scripts/build-services-data.mjs, scripts/fetch-na-meetings.mjs and friends
 * produce. An area with no folder there is skipped. Unlike prisma/seed.ts
 * (fake "[DEMO]" content, opt-in via SEED_DEMO_DATA), this is real content
 * meant to exist in every environment, so it runs unconditionally on every
 * container boot (see docker/entrypoint.sh) as well as from `npm run
 * db:seed`. Upserts are keyed so re-running never duplicates rows.
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "fs";
import path from "path";

const prisma = new PrismaClient();

const REAL_ABOUT_TEXT = `Tampereen Käyttäjäyhteisö pyrkii edustamaan Tampereen päihdekäyttäjäyhteisöä, tunnistaen että yhteisömme koostuu ihmisistä, jotka tulevat hyvin erilaisista lähtökohdista ja ovat hyvin erilaisissa tilanteissa. Ensisijaiseksi katsomme tuoda kaikista huono-osaisempien äänen kuuluviin, sillä tiedostamme että juuri huonoimmassa asemassa olevat ovat suurimman uhan alla ja vaarassa menehtyä.

Tärkein meitä ohjaava periaate on siis henkien pelastaminen. Tämän lisäksi pyrimme edistämään yhteisömme hyvinvointia ja parantamaan suhteitamme yhteiskuntaan, muihin yhteisöihin, naapurustoon ja viranomaisiin.

Tiedostamme että päihdepoliittinen tilanne Suomessa kaipaa parannusta ja vaadimme että vertaistemme ääni on mukana kaikessa yhteisöämme koskevissa asioissa.

Yhteisöömme ovat tervetulleet niin huumeidenkäyttäjät, kuin niitä ennen käyttäneet tai kuka tahansa yhteisöstämme kiinnostunut taho.`;

const REAL_EMAIL = "tampere@kayttajayhteiso.fi";
const REAL_TELEGRAM = "http://dy.fi/7zs";
const REAL_SITE_URL = "https://kayttajayhteiso.fi";
// Seeded onto every install until it was dropped from the paper and the
// site. Cleared below wherever it is still exactly this text, so existing
// databases lose it too; a back-page text an admin has since written
// themselves is left alone.
const RETIRED_BACKPAGE_TEXT =
  "**Haittojen vähentäminen:**\n\n- Älä käytä yksin.\n- Naloksoni pelastaa hengen yliannostuksessa.\n- Terveysneuvontapisteistä saa puhtaita välineitä maksutta.\n";

// Values seed.ts originally used as placeholders — only replaced if a row
// still holds exactly one of these, so an admin's own edits (made through
// /admin/asetukset after this ran once) are never silently overwritten on a
// later boot. The Tampere logo was the site's own before it went national.
const STALE_DEFAULTS = {
  logoPaths: ["/branding/logo-placeholder.svg", "/branding/logo.jpeg"],
  socialInfo: "@tampereenkayttajayhteiso",
};

// Addresses this project has used before moving to its own domain: the
// original placeholder, the Gmail account and the Proton address. The
// 20260926090000_kayttajayhteiso_domain migration rewrites these once; these
// lists are the same correction applied on every boot, so an install that
// was seeded from an older build converges too.
const RETIRED_CONTACT_EMAILS = [
  "info@kayttajayhteiso.fi",
  "trekayttajayhteiso@gmail.com",
  "trekayttajayhteiso@proton.me",
];
const RETIRED_SUBMISSION_EMAILS = ["trekayttajayhteiso@proton.me"];
const RETIRED_SITE_URLS = ["https://kuntoutus.info", "https://tampere.kayttajayhteiso.fi"];

/** The national row. The about text Tampere wrote stays Tampere's (below). */
async function syncSiteSettings(): Promise<void> {
  const existing = await prisma.siteSettings.findUnique({ where: { id: 1 } });

  if (!existing) {
    await prisma.siteSettings.create({ data: { id: 1, publicSiteUrl: REAL_SITE_URL } });
    console.log("SiteSettings: luotu oletusarvoilla.");
    return;
  }

  const fixes: Record<string, string> = {};
  if (STALE_DEFAULTS.logoPaths.includes(existing.logoPath)) fixes.logoPath = "/branding/kayttajayhteiso.jpg";
  if (!existing.publicSiteUrl || RETIRED_SITE_URLS.includes(existing.publicSiteUrl))
    fixes.publicSiteUrl = REAL_SITE_URL;
  if (existing.backPageText === RETIRED_BACKPAGE_TEXT) fixes.backPageText = "";

  if (Object.keys(fixes).length > 0) {
    await prisma.siteSettings.update({ where: { id: 1 }, data: fixes });
    console.log(`SiteSettings: korjattu ${Object.keys(fixes).join(", ")}.`);
  }
}

/**
 * Tampere's contact details and about text, which were the whole site's
 * until areas existed. The Area row itself comes from the areas migration;
 * this fills in what an install seeded from an older build is missing.
 */
async function syncTampere(): Promise<void> {
  const existing = await prisma.area.findUnique({ where: { id: "tampere" } });
  if (!existing) return;

  const fixes: Record<string, string> = {};
  if (!existing.aboutText) fixes.aboutText = REAL_ABOUT_TEXT;
  if (!existing.contactInfo || RETIRED_CONTACT_EMAILS.includes(existing.contactInfo)) fixes.contactInfo = REAL_EMAIL;
  if (!existing.socialInfo || existing.socialInfo === STALE_DEFAULTS.socialInfo) fixes.socialInfo = REAL_TELEGRAM;
  if (!existing.submissionEmail || RETIRED_SUBMISSION_EMAILS.includes(existing.submissionEmail))
    fixes.submissionEmail = REAL_EMAIL;

  if (Object.keys(fixes).length > 0) {
    await prisma.area.update({ where: { id: "tampere" }, data: fixes });
    console.log(`Tampere: korjattu ${Object.keys(fixes).join(", ")}.`);
  }
}

type DirectoryEntry = {
  category: string;
  name: string;
  address: string | null;
  phone: string | null;
  description: string | null;
  lat: number | null;
  lng: number | null;
};

type NaMeetingEntry = {
  sourceId: number;
  name: string;
  weekday: string;
  weekdayIndex: number;
  time: string;
  durationMinutes: number | null;
  address: string | null;
  postalCode: string | null;
  city: string;
  notes: string | null;
  formats: string | null;
  mapLink: string | null;
  onBreakUntil: string | null;
  sourceUrl: string | null;
  lat: number | null;
  lng: number | null;
};

/**
 * Deletes the area's directory rows its source list no longer contains, so
 * renaming or dropping an entry actually removes it instead of leaving the
 * old row beside the new one (the upserts are keyed on area + category +
 * name, so a rename reads as an addition). Only this area's rows are
 * considered: seeding Turku never touches Tampere's directory.
 *
 * An entry someone has attached a Kokemus to is kept and reported instead:
 * deleting it would cascade that note away, and losing what a person wrote
 * is worse than carrying a stale row until an admin looks at it.
 */
async function pruneDirectory(areaId: string, directory: DirectoryEntry[]): Promise<void> {
  const current = new Set(directory.map((d) => `${d.category}\u0000${d.name}`));
  const rows = await prisma.directoryService.findMany({
    where: { areaId },
    select: { id: true, category: true, name: true, _count: { select: { experiences: true } } },
  });

  const stale = rows.filter((r) => !current.has(`${r.category}\u0000${r.name}`));
  const removable = stale.filter((r) => r._count.experiences === 0);
  const kept = stale.filter((r) => r._count.experiences > 0);

  if (removable.length > 0) {
    await prisma.directoryService.deleteMany({ where: { id: { in: removable.map((r) => r.id) } } });
    console.log(`Palveluhakemisto (${areaId}): poistettu ${removable.length} vanhentunutta kohdetta.`);
  }
  for (const row of kept) {
    console.log(
      `Palveluhakemisto (${areaId}): "${row.name}" ei ole enää listalla, mutta siihen liittyy kokemuksia — jätetty poistamatta.`,
    );
  }
}

function readAreaData<T>(areaId: string, name: string): T | null {
  const file = path.join(__dirname, "data", areaId, name);
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf-8")) as T) : null;
}

async function syncDirectory(areaId: string): Promise<void> {
  const directory = readAreaData<DirectoryEntry[]>(areaId, "services.json");
  if (!directory) return;

  for (const entry of directory) {
    await prisma.directoryService.upsert({
      where: { areaId_category_name: { areaId, category: entry.category, name: entry.name } },
      update: {
        address: entry.address,
        phone: entry.phone,
        description: entry.description,
        lat: entry.lat,
        lng: entry.lng,
      },
      create: { ...entry, areaId },
    });
  }
  console.log(
    `Palveluhakemisto (${areaId}): ${directory.length} kohdetta (${directory.filter((d) => d.lat).length} kartalla).`,
  );

  await pruneDirectory(areaId, directory);
}

async function syncNaMeetings(areaId: string): Promise<void> {
  const meetings = readAreaData<NaMeetingEntry[]>(areaId, "na-meetings.json");
  if (!meetings) return;

  for (const m of meetings) {
    const data = {
      areaId,
      name: m.name,
      weekday: m.weekday,
      weekdayIndex: m.weekdayIndex,
      time: m.time,
      durationMinutes: m.durationMinutes,
      address: m.address,
      postalCode: m.postalCode,
      city: m.city,
      notes: m.notes,
      formats: m.formats,
      mapLink: m.mapLink,
      lat: m.lat,
      lng: m.lng,
      onBreakUntil: m.onBreakUntil ? new Date(m.onBreakUntil) : null,
      sourceUrl: m.sourceUrl,
      cancelled: false,
    };
    // sourceId is nasuomi.org's own id, unique across the country.
    await prisma.naMeeting.upsert({
      where: { sourceId: m.sourceId },
      update: data,
      create: { sourceId: m.sourceId, ...data },
    });
  }
  console.log(`NA-ryhmät (${areaId}): ${meetings.length} kokousta (${meetings.filter((m) => m.lat).length} kartalla).`);
}

export async function seedReferenceData(): Promise<void> {
  await syncSiteSettings();
  await syncTampere();

  const areas = await prisma.area.findMany({ orderBy: { sortOrder: "asc" } });
  for (const area of areas) {
    await syncDirectory(area.id);
    await syncNaMeetings(area.id);
  }
}

if (require.main === module) {
  seedReferenceData()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
