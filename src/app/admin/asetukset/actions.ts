"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateSiteSettings(formData: FormData): Promise<void> {
  await requireUser("ADMIN");

  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {
      orgName: String(formData.get("orgName") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      aboutText: String(formData.get("aboutText") ?? "").trim(),
      contactInfo: String(formData.get("contactInfo") ?? "").trim(),
      socialInfo: String(formData.get("socialInfo") ?? "").trim(),
      backPageText: String(formData.get("backPageText") ?? "").trim(),
      logoPath: String(formData.get("logoPath") ?? "/branding/logo.jpeg").trim(),
      submissionEmail: String(formData.get("submissionEmail") ?? "").trim(),
      publicSiteUrl: String(formData.get("publicSiteUrl") ?? "").trim(),
    },
    create: { id: 1 },
  });

  revalidatePath("/admin/asetukset");
  revalidatePath("/");
  revalidatePath("/tietoa");
  revalidatePath("/lehti");
}
