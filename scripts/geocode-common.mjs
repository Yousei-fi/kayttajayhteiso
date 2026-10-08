/** Shared by the geocoding scripts: Nominatim lookups and address cleanup. */

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** One Nominatim lookup. Callers sleep ~1.1s between calls (Nominatim's usage policy). */
export async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query + ", Finland")}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "kayttajayhteiso-seed-script/1.0 (one-time geocoding for a nonprofit zine directory)",
      "Accept-Language": "fi",
    },
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = await res.json();
  return data[0] ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
}

/**
 * Reduces an address to the plain "street number, city" Nominatim can
 * actually find. Real entries carry building, wing, floor and venue
 * qualifiers ("Arkkiatrinkuja 1, T-rakennus, C2, 2. kerros, 33520 Tampere",
 * "A- kilta, Pääskyvuorenrinne 1", "Ratapihankatu 53C 3.krs") which the
 * first pass chokes on, and the street part is not always the first
 * component.
 *
 * The city is the one after a postcode in the address ("33520 Tampere"),
 * else `fallbackCity`.
 */
export function simplifyAddress(address, fallbackCity) {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);

  const city = address.match(/\b\d{5}\s+([A-ZÄÖÅ][a-zäöå-]+)/)?.[1] ?? fallbackCity;
  // The first component that names a street and a number: it starts with a
  // letter (so "33520 Tampere" is out) and is not a floor ("2. kerros").
  const street = parts.find((p) => /^[A-ZÄÖÅ][^,]*\s\d+/.test(p) && !/kerros/i.test(p));
  if (!street || !city) return null;

  // Cut at the street number, dropping stairwell letters, door numbers and
  // a second address after a slash ("Hatanpään valtatie 34 E" ->
  // "Hatanpään valtatie 34"): they narrow it past what the map needs and
  // make the lookup fail.
  return `${street.match(/^(.*?\s\d+)/)[1]}, ${city}`;
}
