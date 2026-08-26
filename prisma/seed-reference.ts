/**
 * Syncs real reference data (the Tampere service directory + Tampere NA
 * meetings) from the JSON files scripts/build-services-data.mjs,
 * scripts/fetch-na-meetings.mjs and friends produce. Unlike prisma/seed.ts
 * (fake "[DEMO]" content, opt-in via SEED_DEMO_DATA), this is real content
 * meant to exist in every environment, so it runs unconditionally on every
 * container boot (see docker/entrypoint.sh) as well as from `npm run
 * db:seed`. Upserts are keyed so re-running never duplicates rows.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import path from "path";

const prisma = new PrismaClient();

const REAL_ABOUT_TEXT = `Tampereen Käyttäjäyhteisö pyrkii edustamaan Tampereen päihdekäyttäjäyhteisöä, tunnistaen että yhteisömme koostuu ihmisistä, jotka tulevat hyvin erilaisista lähtökohdista ja ovat hyvin erilaisissa tilanteissa. Ensisijaiseksi katsomme tuoda kaikista huono-osaisempien äänen kuuluviin, sillä tiedostamme että juuri huonoimmassa asemassa olevat ovat suurimman uhan alla ja vaarassa menehtyä.

Tärkein meitä ohjaava periaate on siis henkien pelastaminen. Tämän lisäksi pyrimme edistämään yhteisömme hyvinvointia ja parantamaan suhteitamme yhteiskuntaan, muihin yhteisöihin, naapurustoon ja viranomaisiin.

Tiedostamme että päihdepoliittinen tilanne Suomessa kaipaa parannusta ja vaadimme että vertaistemme ääni on mukana kaikessa yhteisöämme koskevissa asioissa.

Yhteisöömme ovat tervetulleet niin huumeidenkäyttäjät, kuin niitä ennen käyttäneet tai kuka tahansa yhteisöstämme kiinnostunut taho.`;

const REAL_EMAIL = "trekayttajayhteiso@gmail.com";
const REAL_TELEGRAM = "http://dy.fi/7zs";
const REAL_BACKPAGE_TEXT =
  "**Haittojen vähentäminen:**\n\n- Älä käytä yksin.\n- Naloksoni pelastaa hengen yliannostuksessa.\n- Terveysneuvontapisteistä saa puhtaita välineitä maksutta.\n";

// Values seed.ts originally used as placeholders — only replaced if a
// SiteSettings row still holds exactly one of these, so an admin's own
// edits (made through /admin/asetukset after this ran once) are never
// silently overwritten on a later boot.
const STALE_DEFAULTS = {
  logoPath: "/branding/logo-placeholder.svg",
  contactInfo: "info@kayttajayhteiso.fi",
  socialInfo: "@tampereenkayttajayhteiso",
};

async function syncSiteSettings(): Promise<void> {
  const existing = await prisma.siteSettings.findUnique({ where: { id: 1 } });

  if (!existing) {
    await prisma.siteSettings.create({
      data: {
        id: 1,
        aboutText: REAL_ABOUT_TEXT,
        contactInfo: REAL_EMAIL,
        socialInfo: REAL_TELEGRAM,
        backPageText: REAL_BACKPAGE_TEXT,
      },
    });
    console.log("SiteSettings: luotu oletusarvoilla.");
    return;
  }

  const fixes: Record<string, string> = {};
  if (existing.logoPath === STALE_DEFAULTS.logoPath) fixes.logoPath = "/branding/logo.jpeg";
  if (!existing.aboutText) fixes.aboutText = REAL_ABOUT_TEXT;
  if (!existing.contactInfo || existing.contactInfo === STALE_DEFAULTS.contactInfo) fixes.contactInfo = REAL_EMAIL;
  if (!existing.socialInfo || existing.socialInfo === STALE_DEFAULTS.socialInfo) fixes.socialInfo = REAL_TELEGRAM;
  if (!existing.backPageText) fixes.backPageText = REAL_BACKPAGE_TEXT;

  if (Object.keys(fixes).length > 0) {
    await prisma.siteSettings.update({ where: { id: 1 }, data: fixes });
    console.log(`SiteSettings: korjattu ${Object.keys(fixes).join(", ")}.`);
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

export async function seedReferenceData(): Promise<void> {
  await syncSiteSettings();

  const directoryPath = path.join(__dirname, "data", "services.json");
  const directory: DirectoryEntry[] = JSON.parse(readFileSync(directoryPath, "utf-8"));
  for (const entry of directory) {
    await prisma.directoryService.upsert({
      where: { category_name: { category: entry.category, name: entry.name } },
      update: {
        address: entry.address,
        phone: entry.phone,
        description: entry.description,
        lat: entry.lat,
        lng: entry.lng,
      },
      create: entry,
    });
  }
  console.log(`Palveluhakemisto: ${directory.length} kohdetta (${directory.filter((d) => d.lat).length} kartalla).`);

  const meetingsPath = path.join(__dirname, "data", "na-meetings.json");
  const meetings: NaMeetingEntry[] = JSON.parse(readFileSync(meetingsPath, "utf-8"));
  for (const m of meetings) {
    const data = {
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
    await prisma.naMeeting.upsert({
      where: { sourceId: m.sourceId },
      update: data,
      create: { sourceId: m.sourceId, ...data },
    });
  }
  console.log(`NA-ryhmät (Tampere): ${meetings.length} kokousta (${meetings.filter((m) => m.lat).length} kartalla).`);
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
