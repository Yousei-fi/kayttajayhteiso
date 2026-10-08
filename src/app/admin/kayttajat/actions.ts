"use server";

import { prisma } from "@/lib/db";
import { requireUser, hashPassword } from "@/lib/auth";
import { canActInArea, isNationalAdmin } from "@/lib/area";
import { revalidatePath } from "next/cache";
import type { Role, User } from "@prisma/client";

/**
 * The area a new or edited account gets. A national admin picks any area, or
 * none (a national admin, or a member who only writes articles). An area
 * admin can only place accounts in their own area, so they cannot create
 * a national admin or anyone outside it.
 */
function resolveArea(admin: User, requested: string): string | null {
  if (!isNationalAdmin(admin)) return admin.areaId;
  return requested || null;
}

/** The target account must be one this admin manages. */
async function requireManagedUser(userId: string) {
  const admin = await requireUser("ADMIN");
  const target = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!isNationalAdmin(admin) && (!target.areaId || !canActInArea(admin, target.areaId))) {
    throw new Error("Ei oikeutta muokata tätä käyttäjää.");
  }
  return { admin, target };
}

export async function createUser(formData: FormData): Promise<void> {
  const admin = await requireUser("ADMIN");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "MEMBER") as Role;
  const serviceName = String(formData.get("serviceName") ?? "").trim() || null;
  const areaId = resolveArea(admin, String(formData.get("areaId") ?? ""));

  if (!name || !email || password.length < 8) {
    throw new Error("Nimi, sähköposti ja vähintään 8 merkin salasana vaaditaan.");
  }
  if (role === "SERVICE" && !areaId) {
    throw new Error("Palvelutilille tarvitaan alue.");
  }

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role,
      serviceName: role === "SERVICE" ? serviceName : null,
      areaId,
      active: true,
    },
  });

  revalidatePath("/admin/kayttajat");
}

/** National admins only: move an account to another area, or to none. */
export async function setUserArea(userId: string, formData: FormData): Promise<void> {
  const admin = await requireUser("ADMIN");
  if (!isNationalAdmin(admin)) {
    throw new Error("Vain valtakunnallinen ylläpitäjä voi vaihtaa käyttäjän aluetta.");
  }
  const target = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const areaId = String(formData.get("areaId") ?? "") || null;
  if (target.role === "SERVICE" && !areaId) {
    throw new Error("Palvelutilille tarvitaan alue.");
  }
  await prisma.user.update({ where: { id: userId }, data: { areaId } });
  revalidatePath("/admin/kayttajat");
}

export async function toggleUserActive(userId: string): Promise<void> {
  const { target } = await requireManagedUser(userId);
  await prisma.user.update({ where: { id: userId }, data: { active: !target.active } });
  revalidatePath("/admin/kayttajat");
}

export async function resetUserPassword(userId: string, formData: FormData): Promise<void> {
  await requireManagedUser(userId);
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
