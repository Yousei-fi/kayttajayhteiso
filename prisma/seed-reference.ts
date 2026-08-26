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
