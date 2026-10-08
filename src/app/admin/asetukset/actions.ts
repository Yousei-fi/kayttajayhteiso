"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canActInArea, isNationalAdmin } from "@/lib/area";
import { revalidatePath } from "next/cache";

export async function updateSiteSettings(formData: FormData): Promise<void> {
  const admin = await requireUser("ADMIN");
  if (!isNationalAdmin(admin)) {
    throw new Error("Vain valtakunnallinen ylläpitäjä voi muuttaa koko sivuston asetuksia.");
  }

  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {
      orgName: String(formData.get("orgName") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      aboutText: String(formData.get("aboutText") ?? "").trim(),
      backPageText: String(formData.get("backPageText") ?? "").trim(),
      logoPath: String(formData.get("logoPath") ?? "/branding/kayttajayhteiso.jpg").trim(),
      publicSiteUrl: String(formData.get("publicSiteUrl") ?? "").trim(),
    },
    create: { id: 1 },
  });

  revalidatePath("/", "layout");
}

export async function updateAreaSettings(areaId: string, formData: FormData): Promise<void> {
  const admin = await requireUser("ADMIN");
  if (!canActInArea(admin, areaId)) {
    throw new Error("Ei oikeutta muuttaa tämän alueen asetuksia.");
  }

  await prisma.area.update({
    where: { id: areaId },
    data: {
      aboutText: String(formData.get("aboutText") ?? "").trim(),
      contactInfo: String(formData.get("contactInfo") ?? "").trim(),
      socialInfo: String(formData.get("socialInfo") ?? "").trim(),
      submissionEmail: String(formData.get("submissionEmail") ?? "").trim(),
      // Launching an area is a national decision.
      ...(isNationalAdmin(admin) ? { active: formData.get("active") === "on" } : {}),
    },
  });

  revalidatePath("/", "layout");
}
