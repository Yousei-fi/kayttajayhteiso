import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AREA_COOKIE } from "@/lib/area-slugs";
import type { Area, SiteSettings, User } from "@prisma/client";

export const getActiveAreas = cache(() =>
  prisma.area.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
);

export const getAllAreas = cache(() => prisma.area.findMany({ orderBy: { sortOrder: "asc" } }));

/**
 * The area a public /<area> page belongs to. An unknown slug and an area not
 * launched yet both 404, so an empty Turku section is never half-visible.
 */
export const requireArea = cache(async (slug: string): Promise<Area> => {
  const area = await prisma.area.findUnique({ where: { id: slug } });
  if (!area || !area.active) notFound();
  return area;
});

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

/** The last area this visitor opened, if it is still live. */
export async function getRememberedArea(): Promise<Area | null> {
  const slug = (await cookies()).get(AREA_COOKIE)?.value;
  if (!slug) return null;
  const areas = await getActiveAreas();
  return areas.find((a) => a.id === slug) ?? null;
}

/**
 * The area a signed-in user's dashboard works in: alerts, events, street
 * rounds and the upcoming paper all belong to it.
 *
 * Everyone with a home area works in it. A national admin has none, so they
 * work in whichever area they last picked (the switcher in the dashboard
 * header), including one not launched yet so it can be prepared. Anyone else
 * without an area — a member who only writes national articles — gets null,
 * and the dashboard hides everything tied to a place.
 */
export const getWorkingArea = cache(async (user: User): Promise<Area | null> => {
  if (user.areaId) {
    return prisma.area.findUnique({ where: { id: user.areaId } });
  }
  if (!isNationalAdmin(user)) return null;

  const slug = (await cookies()).get(AREA_COOKIE)?.value;
  const areas = await getAllAreas();
  return areas.find((a) => a.id === slug) ?? areas.find((a) => a.active) ?? areas[0] ?? null;
});

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
