"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isNationalAdmin } from "@/lib/area";
import { AREA_COOKIE } from "@/lib/area-slugs";

/**
 * Switches the area a national admin's dashboard works in. Everyone else is
 * fixed to their home area, so this refuses them.
 */
export async function setWorkingArea(formData: FormData): Promise<void> {
  const user = await requireUser("ADMIN");
  if (!isNationalAdmin(user)) {
    throw new Error("Vain valtakunnallinen ylläpitäjä voi vaihtaa aluetta.");
  }

  const area = await prisma.area.findUniqueOrThrow({ where: { id: String(formData.get("area") ?? "") } });
  (await cookies()).set(AREA_COOKIE, area.id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });

  revalidatePath("/dashboard", "layout");
  revalidatePath("/admin", "layout");
}
