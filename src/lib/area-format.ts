import type { Area, SiteSettings, User } from "@prisma/client";

/**
 * Area helpers with no database or request access: safe in the paper's HTML
 * builder, in scripts, and anywhere else outside a request.
 */

/** "/tampere/palvelut" from an area and "/palvelut". */
export function areaPath(area: Pick<Area, "id">, path = ""): string {
  return `/${area.id}${path}`;
}

/** The area's public address, printed (with a QR code) in its paper. */
export function areaUrl(settings: Pick<SiteSettings, "publicSiteUrl">, area: Pick<Area, "id">): string {
  return `${settings.publicSiteUrl.replace(/\/+$/, "")}/${area.id}`;
}

/** "Tampereen Käyttäjäyhteisö": the community as it is known locally. */
export function areaOrgName(area: Pick<Area, "nameGenitive">): string {
  return `${area.nameGenitive} Käyttäjäyhteisö`;
}

export function naCityNames(area: Pick<Area, "naCityNames">): string[] {
  return area.naCityNames
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

/** An ADMIN with no home area: runs every area plus the national settings. */
export function isNationalAdmin(user: Pick<User, "role" | "areaId">): boolean {
  return user.role === "ADMIN" && !user.areaId;
}

/**
 * Whether this user may change something belonging to the given area. A
 * national admin may change any area; everyone else only their own. The
 * check that a member is the author (or an admin) is separate and still
 * applies on top.
 */
export function canActInArea(user: Pick<User, "role" | "areaId">, areaId: string): boolean {
  return isNationalAdmin(user) || user.areaId === areaId;
}

/**
 * A meeting's street address as listed on the site and in the paper. Where
 * an area spans several cities (Helsinki, Espoo, Vantaa) the street alone
 * does not say which, so the city follows it.
 */
export function meetingAddress(
  area: Pick<Area, "naCityNames">,
  meeting: { address: string | null; city: string },
): string | null {
  if (!meeting.address) return null;
  return naCityNames(area).length > 1 ? `${meeting.address}, ${meeting.city}` : meeting.address;
}
