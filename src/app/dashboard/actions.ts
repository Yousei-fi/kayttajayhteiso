"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isNationalAdmin } from "@/lib/area";
import { WORK_AREA_COOKIE } from "@/lib/area-slugs";

/**
 * Switches the area a national admin's dashboard works in. Everyone else is
 * fixed to their home area, so this refuses them.
 *
 * Lands on the section the admin was in (/admin/lehti/<id> → /admin/lehti):
 * a page about one row of the old area, such as an edition, would 404 in
 * the new one.
 */
export async function setWorkingArea(formData: FormData): Promise<void> {
  const user = await requireUser("ADMIN");
  if (!isNationalAdmin(user)) {
    throw new Error("Vain valtakunnallinen ylläpitäjä voi vaihtaa aluetta.");
  }

  const area = await prisma.area.findUniqueOrThrow({ where: { id: String(formData.get("area") ?? "") } });
  (await cookies()).set(WORK_AREA_COOKIE, area.id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });

  const [root, section] = String(formData.get("from") ?? "").split("/").filter(Boolean);
  const base = root === "admin" ? "/admin" : "/dashboard";
  redirect(section && /^[a-z-]+$/.test(section) ? `${base}/${section}` : base);
}
