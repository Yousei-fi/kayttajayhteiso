/**
 * One-time step: geocodes every address in prisma/data/<area>/services.json
 * against OpenStreetMap's Nominatim API and writes lat/lng back in place.
 * Respects Nominatim's usage policy: max ~1 request/sec, a real
 * identifying User-Agent, and results are cached in the JSON file itself
 * so this never needs to run again unless an address changes.
 */
import { readFileSync, writeFileSync } from "fs";
import { areaDataFile } from "./area-arg.mjs";

const FILE = areaDataFile("services.json");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function geocode(address) {
  const query = `${address}, Tampere, Finland`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "kayttajayhteiso-seed-script/1.0 (one-time geocoding for a nonprofit zine directory)",
      "Accept-Language": "fi",
    },
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status} for "${query}"`);
  const data = await res.json();
  if (!data[0]) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

const services = JSON.parse(readFileSync(FILE, "utf-8"));

for (const s of services) {
  if (!s.address || (s.lat && s.lng)) continue;
  try {
    const coords = await geocode(s.address);
    if (coords) {
      s.lat = coords.lat;
      s.lng = coords.lng;
      console.log(`OK   ${s.name} -> ${coords.lat}, ${coords.lng}`);
    } else {
      console.log(`MISS ${s.name} (${s.address})`);
    }
  } catch (err) {
    console.log(`FAIL ${s.name}: ${err.message}`);
  }
  await sleep(1100);
}

writeFileSync(FILE, JSON.stringify(services, null, 2) + "\n");
console.log("Done.");
