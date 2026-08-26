import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, "../prisma/data/na-meetings.json");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function geocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "kuntoutus-info2-seed-script/1.0 (one-time geocoding for a nonprofit zine directory)",
      "Accept-Language": "fi",
    },
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status} for "${address}"`);
  const data = await res.json();
  return data[0] ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
}

const meetings = JSON.parse(readFileSync(FILE, "utf-8"));

// Geocode each unique address only once (many meetings share a venue).
const cache = new Map();

for (const m of meetings) {
  if (!m.address || (m.lat && m.lng)) continue;
  const query = `${m.address}, ${m.postalCode ?? ""} ${m.city}, Finland`.replace(/\s+/g, " ").trim();

  if (!cache.has(query)) {
    try {
      const coords = await geocode(query);
      cache.set(query, coords);
      console.log(coords ? `OK   ${query} -> ${coords.lat}, ${coords.lng}` : `MISS ${query}`);
      await sleep(1100);
    } catch (err) {
      console.log(`FAIL ${query}: ${err.message}`);
      cache.set(query, null);
      await sleep(1100);
    }
  }

  const coords = cache.get(query);
  if (coords) {
    m.lat = coords.lat;
    m.lng = coords.lng;
  }
}

writeFileSync(FILE, JSON.stringify(meetings, null, 2) + "\n");
console.log(`Done. ${meetings.filter((m) => m.lat).length}/${meetings.length} meetings geocoded.`);
