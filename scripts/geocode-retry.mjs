import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, "../prisma/data/services.json");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Manual queries for addresses that survive simplify() and still miss.
const overrides = {};

/**
 * Reduces a directory address to the plain "street number, city" Nominatim
 * can actually find. Real entries carry building, wing, floor and venue
 * qualifiers ("Arkkiatrinkuja 1, T-rakennus, C2, 2. kerros, 33520 Tampere",
 * "Tampereen YAD-olkkari, Kumppanuustalo Arttelin 2. kerros,
 * Mustanlahdenkatu 22, 33210 Tampere") which the first pass chokes on, and
 * the street part is not always the first component.
 */
function simplify(address) {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);

  const city = /kangasala/i.test(address) ? "Kangasala" : "Tampere";
  // The first component that names a street and a number: it starts with a
  // letter (so "33520 Tampere" is out) and is not a floor ("2. kerros").
  const street = parts.find((p) => /^[A-ZÄÖÅ][^,]*\s\d+/.test(p) && !/kerros/i.test(p));
  if (!street) return null;

  // Cut at the street number, dropping stairwell letters and door numbers
  // ("Hatanpään valtatie 34 E" -> "Hatanpään valtatie 34"): they narrow it
  // past what the map needs and make the lookup fail.
  return `${street.match(/^(.*?\s\d+)/)[1]}, ${city}`;
}

async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query + ", Finland")}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "kuntoutus-info2-seed-script/1.0 (one-time geocoding for a nonprofit zine directory)",
      "Accept-Language": "fi",
    },
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = await res.json();
  return data[0] ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
}

const services = JSON.parse(readFileSync(FILE, "utf-8"));

for (const s of services) {
  if (!s.address || (s.lat && s.lng)) continue;
  const query = overrides[s.name] ?? simplify(s.address);
  if (!query) {
    console.log(`NO QUERY   ${s.name} (${s.address})`);
    continue;
  }
  const coords = await geocode(query);
  if (coords) {
    s.lat = coords.lat;
    s.lng = coords.lng;
    console.log(`OK   ${s.name} -> ${coords.lat}, ${coords.lng}   [${query}]`);
  } else {
    console.log(`STILL MISS ${s.name} (tried "${query}")`);
  }
  await sleep(1100);
}

writeFileSync(FILE, JSON.stringify(services, null, 2) + "\n");
