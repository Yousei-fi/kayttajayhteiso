"use server";

import { prisma } from "@/lib/db";
import { requireUser, hashPassword } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";

export async function createUser(formData: FormData): Promise<void> {
  await requireUser("ADMIN");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "MEMBER") as Role;
  const serviceName = String(formData.get("serviceName") ?? "").trim() || null;

  if (!name || !email || password.length < 8) {
    throw new Error("Nimi, sähköposti ja vähintään 8 merkin salasana vaaditaan.");
  }

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role,
      serviceName: role === "SERVICE" ? serviceName : null,
      active: true,
    },
  });

  revalidatePath("/admin/kayttajat");
}

export async function toggleUserActive(userId: string): Promise<void> {
  await requireUser("ADMIN");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  await prisma.user.update({ where: { id: userId }, data: { active: !user.active } });
  revalidatePath("/admin/kayttajat");
}

export async function resetUserPassword(userId: string, formData: FormData): Promise<void> {
  await requireUser("ADMIN");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    throw new Error("Salasanan tulee olla vähintään 8 merkkiä.");
  }
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password) },
  });
  revalidatePath("/admin/kayttajat");
}
