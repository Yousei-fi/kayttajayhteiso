/**
 * One-time (re-run manually to refresh) build step: fetches all NA
 * meetings from NA Suomi's public WordPress REST API, keeps only
 * Tampere ones, and writes prisma/data/<area>/na-meetings.json. Mirrors
 * build-services-data.mjs / geocode-services.mjs in spirit — the running
 * app never calls nasuomi.org itself, it just reads the JSON this
 * produces.
 *
 * Source: https://www.nasuomi.org/wp-json/wp/v2/kokoukset (NA Suomi's own
 * public meeting directory API, the same one github.com/Yousei-fi/12askelta
 * polls weekly).
 */
import { writeFileSync } from "fs";
import { areaDataFile } from "./area-arg.mjs";

const OUT = areaDataFile("na-meetings.json");

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

function stripHtml(html) {
  return String(html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchAllMeetings() {
  let all = [];
  let page = 1;
  while (true) {
    const url = `https://www.nasuomi.org/wp-json/wp/v2/kokoukset?per_page=100&page=${page}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "kuntoutus-info2-build-script/1.0 (fetching public Tampere NA meeting times)" },
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

const all = await fetchAllMeetings();
console.log(`Fetched ${all.length} meetings nationwide.`);

const tampere = all
  .filter((m) => (m.kaupunki || "").toLowerCase().includes("tampere"))
  .filter((m) => (m.cancelled_for_now || "").trim().toLowerCase() !== "kyllä")
  .map((m) => {
    const weekday = m.weekday || "";
    return {
      sourceId: m.id,
      name: (m.title?.rendered || "").trim(),
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
  })
  .filter((m) => m.weekdayIndex && m.time); // need both to ever appear in "next meetings"

writeFileSync(OUT, JSON.stringify(tampere, null, 2) + "\n");
console.log(`Wrote ${tampere.length} Tampere meetings -> ${OUT}`);
