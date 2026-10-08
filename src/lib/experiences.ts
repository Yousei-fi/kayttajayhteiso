import "server-only";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getRequestIp } from "@/lib/request-ip";
import { isIpBanned } from "@/lib/bans";
import { cleanExperienceBody, type ExperienceFormState } from "@/lib/experience-format";

/**
 * Anonymous by design: no login, no author field. The only defenses are a
 * server-side length check, tag-stripping, and an IP ban list an admin
 * manages at /admin/kokemukset — deliberately no CAPTCHA or automatic
 * rate limiting for this MVP (see README).
 */
export async function postExperience(
  areaId: string,
  serviceId: string,
  rawBody: string,
): Promise<ExperienceFormState> {
  const ip = await getRequestIp();
  if (await isIpBanned(ip)) {
    return { error: "Tämä IP-osoite on tilapäisesti estetty kokemusten jättämiseltä." };
  }

  const service = await prisma.directoryService.findFirst({ where: { id: serviceId, areaId } });
  if (!service) return { error: "Valitse palvelu, josta kokemuksesi kertoo." };

  const body = cleanExperienceBody(rawBody);
  if (!body) return { error: "Kirjoita ensin kokemuksesi." };

  await prisma.experience.create({ data: { serviceId, body, ipAddress: ip } });

  revalidatePath(`/${areaId}/palvelut/${serviceId}`);
  revalidatePath(`/${areaId}/palvelut`);
  revalidatePath(`/${areaId}/kokemukset`);
  revalidatePath(`/${areaId}`);
  revalidatePath("/");
  return { ok: true };
}
