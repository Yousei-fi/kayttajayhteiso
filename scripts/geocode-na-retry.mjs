import { readFileSync, writeFileSync } from "fs";
import { areaDataFile } from "./area-arg.mjs";

const FILE = areaDataFile("na-meetings.json");

async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "kuntoutus-info2-seed-script/1.0 (one-time geocoding for a nonprofit zine directory)",
      "Accept-Language": "fi",
    },
  });
  const data = await res.json();
  return data[0] ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
}

const meetings = JSON.parse(readFileSync(FILE, "utf-8"));
const coords = await geocode("Kisakentänkatu 18, Tampere, Finland");
if (coords) {
  for (const m of meetings) {
    if (!m.lat && m.address?.includes("Kisakentänkatu 18")) {
      m.lat = coords.lat;
      m.lng = coords.lng;
      console.log(`Fixed: ${m.name} (${m.weekday})`);
    }
  }
}
writeFileSync(FILE, JSON.stringify(meetings, null, 2) + "\n");
