/**
 * Second geocoding pass for an area's services.json: retries whatever
 * geocode-services.mjs missed with a simplified address (see
 * simplifyAddress). Run after it, with the same --area.
 */
import { readFileSync, writeFileSync } from "fs";
import { AREA, areaDataFile } from "./area-arg.mjs";
import { geocode, simplifyAddress, sleep } from "./geocode-common.mjs";

const FILE = areaDataFile("services.json");

// For an address with no postcode: the area's main city.
const FALLBACK_CITY = { tampere: "Tampere", turku: "Turku", paakaupunkiseutu: "Helsinki" }[AREA];

// Manual queries, by service name, for addresses that survive
// simplifyAddress() and still miss.
const overrides = {};

const services = JSON.parse(readFileSync(FILE, "utf-8"));

for (const s of services) {
  if (!s.address || (s.lat && s.lng)) continue;
  const query = overrides[s.name] ?? simplifyAddress(s.address, FALLBACK_CITY);
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
