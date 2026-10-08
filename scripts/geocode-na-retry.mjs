/**
 * Second geocoding pass for an area's na-meetings.json: retries whatever
 * geocode-na-meetings.mjs missed with a simplified address (see
 * simplifyAddress), so "Ratapihankatu 53C 3.krs" is looked up as
 * "Ratapihankatu 53, Turku". Run after it, with the same --area.
 */
import { readFileSync, writeFileSync } from "fs";
import { areaDataFile } from "./area-arg.mjs";
import { geocode, simplifyAddress, sleep } from "./geocode-common.mjs";

const FILE = areaDataFile("na-meetings.json");

// Manual queries, by street address as nasuomi.org gives it, for addresses
// that survive simplifyAddress() and still miss — mostly misspellings in the
// source, which are better reported to NA Suomi than fixed here for good.
const overrides = {
  "Norderskiöldinkatu 20, rakennus 15": "Nordenskiöldinkatu 20, Helsinki",
  "Topparinkuja 2": "Topparikuja 2, Helsinki",
};

const meetings = JSON.parse(readFileSync(FILE, "utf-8"));
const cache = new Map();

for (const m of meetings) {
  if (!m.address || (m.lat && m.lng)) continue;
  const query = overrides[m.address] ?? simplifyAddress(m.address, m.city);
  if (!query) {
    console.log(`NO QUERY   ${m.name} (${m.address})`);
    continue;
  }
  if (!cache.has(query)) {
    cache.set(query, await geocode(query));
    await sleep(1100);
  }
  const coords = cache.get(query);
  if (coords) {
    m.lat = coords.lat;
    m.lng = coords.lng;
    console.log(`OK   ${m.name} -> ${coords.lat}, ${coords.lng}   [${query}]`);
  } else {
    console.log(`STILL MISS ${m.name} (tried "${query}")`);
  }
}

writeFileSync(FILE, JSON.stringify(meetings, null, 2) + "\n");
console.log(`Done. ${meetings.filter((m) => m.lat).length}/${meetings.length} meetings geocoded.`);
