/**
 * The areas' URL slugs, as plain constants so src/proxy.ts can use them
 * without a database. They are the Area rows' ids and are printed in QR
 * codes, so a slug never changes once an area exists; adding an area means
 * adding it here as well as in a migration.
 */
export const AREA_SLUGS = ["paakaupunkiseutu", "tampere", "turku"] as const;

/** Short print-friendly aliases, redirected to the full slug. */
export const AREA_ALIASES: Record<string, (typeof AREA_SLUGS)[number]> = {
  pks: "paakaupunkiseutu",
};

/** Where a visitor with no remembered area lands for a pre-areas path. */
export const DEFAULT_AREA_SLUG = "tampere";

/**
 * Remembers the last area a visitor opened, so the national front page can
 * lead with it and old root-level paths (/palvelut) know where to go. Also
 * the dashboard's working area for a national admin.
 */
export const AREA_COOKIE = "kk_area";

/**
 * Root-level paths from before areas existed. Each now lives under an area
 * (/palvelut -> /tampere/palvelut); the proxy sends them to the visitor's
 * remembered area.
 */
export const AREA_SECTIONS = ["palvelut", "na-ryhmat", "tapahtumat", "ilmoitukset", "lehti"] as const;

export function isAreaSlug(value: string | undefined): value is (typeof AREA_SLUGS)[number] {
  return !!value && (AREA_SLUGS as readonly string[]).includes(value);
}
