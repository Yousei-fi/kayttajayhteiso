"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getRequestIp } from "@/lib/request-ip";
import { isIpBanned } from "@/lib/bans";

const MAX_LENGTH = 300;

export type ExperienceFormState = { error?: string };

/**
 * Anonymous by design: no login, no author field. The only defenses are a
 * server-side length check, tag-stripping, and an IP ban list an admin
 * manages at /admin/kokemukset — deliberately no CAPTCHA or automatic
 * rate limiting for this MVP (see README).
 */
export async function addExperience(
  serviceId: string,
  _prev: ExperienceFormState,
  formData: FormData,
): Promise<ExperienceFormState> {
  const ip = await getRequestIp();
  if (await isIpBanned(ip)) {
    return { error: "Tämä IP-osoite on tilapäisesti estetty kokemusten jättämiseltä." };
  }

  const body = String(formData.get("body") ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_LENGTH);

  if (!body) {
    return { error: "Kirjoita ensin kokemuksesi." };
  }

  const service = await prisma.directoryService.findUniqueOrThrow({ where: { id: serviceId } });
  await prisma.experience.create({ data: { serviceId, body, ipAddress: ip } });

  revalidatePath(`/${service.areaId}/palvelut/${serviceId}`);
  revalidatePath(`/${service.areaId}/palvelut`);
  return {};
}
