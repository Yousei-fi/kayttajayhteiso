"use server";

import { requireAreaUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createStreetRound(formData: FormData): Promise<void> {
  const { user, area, db } = await requireAreaUser("MEMBER", "ADMIN");

  const dateStr = String(formData.get("date") ?? "");
  const participants = String(formData.get("participants") ?? "").trim() || null;
  const place = String(formData.get("place") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim();

  if (!dateStr || !notes) {
    throw new Error("Päivämäärä ja muistiinpanot vaaditaan.");
  }

  const round = await db.streetRound.create({
    data: { areaId: area.id, authorId: user.id, date: new Date(dateStr), participants, place, notes },
  });

  revalidatePath("/dashboard/kierrokset");
  redirect(`/dashboard/kierrokset/${round.id}`);
}

export async function updateStreetRound(roundId: string, formData: FormData): Promise<void> {
  const { user, db } = await requireAreaUser("MEMBER", "ADMIN");
  const round = await db.streetRound.findUniqueOrThrow({ where: { id: roundId } });
  if (user.role !== "ADMIN" && round.authorId !== user.id) {
    throw new Error("Ei oikeutta muokata tätä kierrosta.");
  }

  const dateStr = String(formData.get("date") ?? "");
  const participants = String(formData.get("participants") ?? "").trim() || null;
  const place = String(formData.get("place") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim();

  await db.streetRound.update({
    where: { id: round.id },
    data: { date: new Date(dateStr), participants, place, notes },
  });

  revalidatePath("/dashboard/kierrokset");
  revalidatePath(`/dashboard/kierrokset/${round.id}`);
}

export async function deleteStreetRound(roundId: string): Promise<void> {
  const { user, db } = await requireAreaUser("MEMBER", "ADMIN");
  const round = await db.streetRound.findUniqueOrThrow({ where: { id: roundId } });
  if (user.role !== "ADMIN" && round.authorId !== user.id) {
    throw new Error("Ei oikeutta poistaa tätä kierrosta.");
  }
  await db.streetRound.delete({ where: { id: round.id } });
  revalidatePath("/dashboard/kierrokset");
  redirect("/dashboard/kierrokset");
}
