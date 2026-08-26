"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

const MAX_LENGTH = 300;

/**
 * Anonymous by design: no login, no author field. Only defense is a
 * server-side length check and stripping control/markup characters —
 * deliberately no CAPTCHA or rate limiting for this MVP (see README).
 */
export async function addExperience(serviceId: string, formData: FormData): Promise<void> {
  const body = String(formData.get("body") ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_LENGTH);

  if (!body) {
    throw new Error("Kirjoita ensin kokemuksesi.");
  }

  await prisma.directoryService.findUniqueOrThrow({ where: { id: serviceId } });

  await prisma.serviceExperience.create({
    data: { serviceId, body },
  });

  revalidatePath(`/palvelut/${serviceId}`);
  revalidatePath("/palvelut");
}
