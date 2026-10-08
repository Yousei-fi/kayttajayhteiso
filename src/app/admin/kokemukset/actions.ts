"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canActInArea } from "@/lib/area";
import { revalidatePath } from "next/cache";

/** An area admin moderates their own area's Kokemukset; a national admin, all. */
export async function deleteExperience(experienceId: string): Promise<void> {
  const admin = await requireUser("ADMIN");
  const experience = await prisma.experience.findUniqueOrThrow({
    where: { id: experienceId },
    include: { service: { select: { areaId: true } }, meeting: { select: { areaId: true } } },
  });
  const areaId = experience.service?.areaId ?? experience.meeting?.areaId;
  if (!areaId || !canActInArea(admin, areaId)) {
    throw new Error("Ei oikeutta poistaa tätä kokemusta.");
  }

  await prisma.experience.delete({ where: { id: experienceId } });
  revalidatePath("/admin/kokemukset");
  revalidatePath(`/${areaId}/palvelut`, "layout");
}

export async function banIp(formData: FormData): Promise<void> {
  await requireUser("ADMIN");

  const ipAddress = String(formData.get("ipAddress") ?? "").trim();
  const days = Number(formData.get("days") ?? 7);
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!ipAddress || !Number.isFinite(days) || days <= 0) {
    throw new Error("Anna kelvollinen IP-osoite ja päivien määrä.");
  }

  const bannedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await prisma.bannedIp.upsert({
    where: { ipAddress },
    update: { bannedUntil, reason },
    create: { ipAddress, bannedUntil, reason },
  });

  revalidatePath("/admin/kokemukset");
}

export async function unbanIp(banId: string): Promise<void> {
  await requireUser("ADMIN");
  await prisma.bannedIp.delete({ where: { id: banId } });
  revalidatePath("/admin/kokemukset");
}
