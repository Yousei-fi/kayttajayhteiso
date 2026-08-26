"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function deleteExperience(experienceId: string): Promise<void> {
  await requireUser("ADMIN");
  await prisma.serviceExperience.delete({ where: { id: experienceId } });
  revalidatePath("/admin/kokemukset");
  revalidatePath("/palvelut");
}
