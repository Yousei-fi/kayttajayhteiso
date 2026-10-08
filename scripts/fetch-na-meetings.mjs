/**
 * Build step (re-run manually to refresh): fetches all NA meetings from NA
 * Suomi's public WordPress REST API and writes each area's
 * prisma/data/<area>/na-meetings.json in one run. A meeting belongs to the
 * area whose Area.naCityNames lists its `kaupunki` (exact, case-insensitive),
 * so the city lists are read from the database (DATABASE_URL). Meetings in
 * no area's list are skipped. Mirrors build-services-data.mjs /
 * geocode-services.mjs in spirit — the running app never calls nasuomi.org
 * itself, it just reads the JSON this produces.
 *
 * Coordinates from the previous file are carried over for any meeting whose
 * address has not changed, so a refresh does not undo geocoding; run
 * geocode-na-meetings.mjs --area <slug> afterwards for anything new.
 *
 * Source: https://www.nasuomi.org/wp-json/wp/v2/kokoukset (NA Suomi's own
 * public meeting directory API, the same one github.com/Yousei-fi/12askelta
 * polls weekly).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../prisma/data");

const WEEKDAY_INDEX = {
  Maanantai: 1,
  Tiistai: 2,
  Keskiviikko: 3,
  Torstai: 4,
  Perjantai: 5,
  Lauantai: 6,
  Sunnuntai: 7,
};

function normalizeTime(raw) {
  const m = String(raw ?? "").trim().match(/^(\d{1,2})[.:](\d{2})/);
  if (!m) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

// dd.mm.yyyy -> ISO date string, or null
function parseFinDate(raw) {
  const m = String(raw ?? "").trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d)).toISOString();
}

const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/**
 * WordPress returns titles and text HTML-escaped ("Puhtaat &#038; Rohkeat",
 * "&#8211;"). The app escapes on output itself, so store plain text: left
 * encoded, the paper would print "&#038;".
 */
function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
    if (code[0] !== "#") return NAMED_ENTITIES[code.toLowerCase()] ?? whole;
    const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return Number.isFinite(n) ? String.fromCodePoint(n) : whole;
  });
}

function stripHtml(html) {
  return decodeEntities(String(html ?? "").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchAllMeetings() {
  let all = [];
  let page = 1;
  while (true) {
    const url = `https://www.nasuomi.org/wp-json/wp/v2/kokoukset?per_page=100&page=${page}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "kayttajayhteiso-build-script/1.0 (fetching public NA meeting times)" },
    });
    if (!res.ok) break;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    all = all.concat(data);
    const totalPages = parseInt(res.headers.get("X-WP-TotalPages") || "1", 10);
    if (page >= totalPages) break;
    page++;
  }
  return all;
}

function toEntry(m) {
  const weekday = m.weekday || "";
  return {
    sourceId: m.id,
    name: stripHtml(m.title?.rendered),
    weekday,
    weekdayIndex: WEEKDAY_INDEX[weekday] ?? null,
    time: normalizeTime(m.alkamisaika),
    durationMinutes: m.kesto ? parseInt(m.kesto, 10) || null : null,
    address: (m.katuosoite || "").trim() || null,
    postalCode: (m.postinumero || "").trim() || null,
    city: (m.kaupunki || "").trim(),
    notes: stripHtml(m.lisatiedot) || null,
    formats: m.rel_kokousmuodot && m.rel_kokousmuodot !== false ? String(m.rel_kokousmuodot) : null,
    mapLink: m.karttalinkki || null,
    onBreakUntil: parseFinDate(m.tauolla_pvm_asti),
    sourceUrl: m.link || null,
    lat: null,
    lng: null,
  };
}

const placeKey = (m) => `${m.address ?? ""}|${m.postalCode ?? ""}|${m.city}`;

/** The previous file's coordinates, by sourceId, for unchanged addresses. */
function previousCoords(file) {
  if (!existsSync(file)) return new Map();
  const previous = JSON.parse(readFileSync(file, "utf-8"));
  return new Map(previous.filter((m) => m.lat != null).map((m) => [m.sourceId, m]));
}

const prisma = new PrismaClient();
const areas = await prisma.area.findMany({ orderBy: { sortOrder: "asc" } });
await prisma.$disconnect();

const areaByCity = new Map();
for (const area of areas) {
  for (const city of area.naCityNames.split(",").map((c) => c.trim().toLowerCase()).filter(Boolean)) {
    areaByCity.set(city, area.id);
  }
}

const all = await fetchAllMeetings();
console.log(`Fetched ${all.length} meetings nationwide.`);

const byArea = new Map(areas.map((a) => [a.id, []]));
for (const m of all) {
  const areaId = areaByCity.get((m.kaupunki || "").trim().toLowerCase());
  if (!areaId) continue;
  if ((m.cancelled_for_now || "").trim().toLowerCase() === "kyllä") continue;
  const entry = toEntry(m);
  if (!entry.weekdayIndex || !entry.time) continue; // need both to ever appear in "next meetings"
  byArea.get(areaId).push(entry);
}

for (const area of areas) {
  const meetings = byArea.get(area.id);
  const file = path.join(DATA_DIR, area.id, "na-meetings.json");
  const previous = previousCoords(file);
  let kept = 0;
  for (const m of meetings) {
    const before = previous.get(m.sourceId);
    if (before && placeKey(before) === placeKey(m)) {
      m.lat = before.lat;
      m.lng = before.lng;
      kept++;
    }
  }

  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(meetings, null, 2) + "\n");
  const missing = meetings.filter((m) => m.address && m.lat == null).length;
  console.log(
    `${area.name}: ${meetings.length} meetings (${kept} kept their coordinates, ${missing} to geocode) -> ${file}`,
  );
}
