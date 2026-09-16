/**
 * One-time build step (not run at app startup or in seed.ts): parses
 * prisma/data/services-source.txt into structured entries and writes
 * prisma/data/services.json, which prisma/seed.ts reads directly. Kept
 * separate from seeding because it also geocodes addresses against the
 * Nominatim API, which is slow (rate-limited to ~1 req/sec) and has no
 * reason to run more than once — re-run manually only if the source text
 * or an address changes.
 */
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "../prisma/data/services-source.txt");
const OUT = path.join(__dirname, "../prisma/data/services.json");

const raw = readFileSync(SRC, "utf-8");
const lines = raw.split("\n").map((l) => l.replace(/\r$/, ""));

function isHeading(line) {
  const t = line.trim();
  if (!t) return false;
  if (t.startsWith("•")) return false;
  // Heading lines are all-caps (Finnish letters included), no lowercase.
  const letters = t.replace(/[^A-Za-zÄÖÅäöå]/g, "");
  if (letters.length < 3) return false;
  return letters === letters.toUpperCase();
}

const entries = [];
let category = "Muut";
let current = null;

function pushCurrent() {
  if (current) entries.push(current);
  current = null;
}

for (const line of lines) {
  const t = line.trim();
  if (!t) continue;

  if (isHeading(line)) {
    pushCurrent();
    category = t;
    continue;
  }

  if (t.startsWith("•")) {
    pushCurrent();
    current = {
      category,
      name: t.replace(/^•\s*/, "").trim(),
      address: null,
      phone: null,
      descriptionLines: [],
    };
    continue;
  }

  if (!current) continue;

  const addressMatch = t.match(/^Osoite:\s*(.+?)\.?$/i);
  if (addressMatch) {
    current.address = addressMatch[1].trim();
    continue;
  }

  const officeMatch = t.match(/^Tampereen toimipiste:\s*(.+?)\.?$/i);
  if (officeMatch) {
    if (!current.address) current.address = officeMatch[1].trim();
    current.descriptionLines.push(t);
    continue;
  }

  // A bare street-address line with no "Osoite:" label, e.g. "Tipotie 4, Tampere."
  const bareAddressMatch = t.match(/^([A-ZÄÖÅ][\wäöåÄÖÅ.\-]*(?:\s[\wäöåÄÖÅ.\-]+)*\s\d+[\w\-–,.\s]*,\s*Tampere)\.?$/);
  if (bareAddressMatch && !current.address) {
    current.address = bareAddressMatch[1].trim();
    continue;
  }

  // A labelled phone line is captured into `phone` and kept out of the
  // description: it used to be pushed into both, so every entry's
  // description opened by repeating its own number ("Puhelin: 116 117
  // Kiireelliset…") and readers saw it twice.
  const phoneLabelMatch = t.match(/^(Puhelin|Ajanvaraus|Soita|Numero):\s*(.+?)\.?$/i);
  if (phoneLabelMatch) {
    if (!current.phone) current.phone = phoneLabelMatch[2].trim();
    continue;
  }

  current.descriptionLines.push(t);

  if (!current.phone) {
    const phoneMatch = t.match(/(\+358[\d\s]{6,}|\b0\d{2,3}[\d\s]{5,}\d\b)/);
    if (phoneMatch) current.phone = phoneMatch[1].trim();
  }
}
pushCurrent();

const result = entries.map((e) => ({
  category: e.category,
  name: e.name,
  address: e.address,
  phone: e.phone,
  description: e.descriptionLines.join(" ").trim() || null,
  lat: null,
  lng: null,
}));

writeFileSync(OUT, JSON.stringify(result, null, 2) + "\n");
console.log(`Parsed ${result.length} entries (${result.filter((r) => r.address).length} with an address) -> ${OUT}`);
