import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, "../prisma/data/services.json");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Manual simplified queries for addresses the first geocoding pass missed
// (building/floor qualifiers like "O-rakennus, yläpiha" confuse Nominatim).
const overrides = {
  "Pirkanmaan sosiaali- ja kriisipäivystys": "Sorinkatu 12, Tampere",
  "Tays psykiatrian päivystyspoliklinikka": "Arkkiatrinkuja 1, Tampere",
  "Happi – Päihde- ja riippuvuussairauksien yksikkö": "Hatanpäänkatu 22, Tampere",
  "Vety – Riippuvuushoidon yksikkö": "Elämänaukio 2, Tampere",
  "Maria Akatemia ry": "Puutarhakatu 11, Tampere",
};

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
  if (!(s.name in overrides) || (s.lat && s.lng)) continue;
  const coords = await geocode(overrides[s.name]);
  if (coords) {
    s.lat = coords.lat;
    s.lng = coords.lng;
    console.log(`OK   ${s.name} -> ${coords.lat}, ${coords.lng}`);
  } else {
    console.log(`STILL MISS ${s.name}`);
  }
  await sleep(1100);
}

writeFileSync(FILE, JSON.stringify(services, null, 2) + "\n");
