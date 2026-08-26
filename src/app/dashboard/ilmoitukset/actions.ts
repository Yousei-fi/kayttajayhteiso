"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseOptionalDate(value: FormDataEntryValue | null): Date | null {
  const s = String(value ?? "").trim();
  return s ? new Date(s) : null;
}

export async function createAlert(formData: FormData): Promise<void> {
  const user = await requireUser("SERVICE", "ADMIN");

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const validFrom = parseOptionalDate(formData.get("validFrom"));
  const validUntil = parseOptionalDate(formData.get("validUntil"));

  if (!title || !body) {
    throw new Error("Otsikko ja teksti vaaditaan.");
  }

  await prisma.alert.create({
    data: { serviceUserId: user.id, title, body, validFrom, validUntil, includeInZine: true },
  });

  revalidatePath("/dashboard/ilmoitukset");
  revalidatePath("/ilmoitukset");
  redirect("/dashboard/ilmoitukset");
}

async function assertCanEdit(alertId: string) {
  const user = await requireUser("SERVICE", "ADMIN");
  const alert = await prisma.alert.findUniqueOrThrow({ where: { id: alertId } });
  if (user.role !== "ADMIN" && alert.serviceUserId !== user.id) {
    throw new Error("Ei oikeutta muokata tätä ilmoitusta.");
  }
  return { user, alert };
}

export async function updateAlert(alertId: string, formData: FormData): Promise<void> {
  const { alert } = await assertCanEdit(alertId);

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const validFrom = parseOptionalDate(formData.get("validFrom"));
  const validUntil = parseOptionalDate(formData.get("validUntil"));
  const includeInZine = formData.get("includeInZine") === "on";

  if (!title || !body) {
    throw new Error("Otsikko ja teksti vaaditaan.");
  }

  await prisma.alert.update({
    where: { id: alert.id },
    data: { title, body, validFrom, validUntil, includeInZine },
  });

  revalidatePath("/dashboard/ilmoitukset");
  revalidatePath("/ilmoitukset");
}

export async function archiveAlert(alertId: string): Promise<void> {
  const { alert } = await assertCanEdit(alertId);
  await prisma.alert.update({ where: { id: alert.id }, data: { archived: true } });
  revalidatePath("/dashboard/ilmoitukset");
  revalidatePath("/ilmoitukset");
}

export async function deleteAlert(alertId: string): Promise<void> {
  const { alert } = await assertCanEdit(alertId);
  await prisma.alert.delete({ where: { id: alert.id } });
  revalidatePath("/dashboard/ilmoitukset");
  revalidatePath("/ilmoitukset");
  redirect("/dashboard/ilmoitukset");
}

export async function duplicateAlert(alertId: string): Promise<void> {
  const { user, alert } = await assertCanEdit(alertId);
  const copy = await prisma.alert.create({
    data: {
      serviceUserId: user.id,
      title: alert.title,
      body: alert.body,
      includeInZine: true,
    },
  });
  redirect(`/dashboard/ilmoitukset/${copy.id}`);
}
