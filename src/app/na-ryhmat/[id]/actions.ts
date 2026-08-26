"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getRequestIp } from "@/lib/request-ip";
import { isIpBanned } from "@/lib/bans";
import type { ExperienceFormState } from "@/components/experience-form";

const MAX_LENGTH = 300;

export async function addMeetingExperience(
  meetingId: string,
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

  await prisma.naMeeting.findUniqueOrThrow({ where: { id: meetingId } });
  await prisma.experience.create({ data: { meetingId, body, ipAddress: ip } });

  revalidatePath(`/na-ryhmat/${meetingId}`);
  revalidatePath("/na-ryhmat");
  return {};
}
