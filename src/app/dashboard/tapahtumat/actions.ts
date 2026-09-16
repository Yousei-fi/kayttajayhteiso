"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type EventFields = {
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  body: string;
  includeInZine: boolean;
};

function readEventFields(formData: FormData): EventFields {
  const title = String(formData.get("title") ?? "").trim();
  const startsAtStr = String(formData.get("startsAt") ?? "");
  const endsAtStr = String(formData.get("endsAt") ?? "");
  const location = String(formData.get("location") ?? "").trim() || null;
  const body = String(formData.get("body") ?? "").trim();

  if (!title || !startsAtStr || !body) {
    throw new Error("Otsikko, alkamisaika ja kuvaus vaaditaan.");
  }

  const startsAt = new Date(startsAtStr);
  const endsAt = endsAtStr ? new Date(endsAtStr) : null;
  if (Number.isNaN(startsAt.getTime()) || (endsAt && Number.isNaN(endsAt.getTime()))) {
    throw new Error("Tarkista päivämäärät.");
  }
  if (endsAt && endsAt < startsAt) {
    throw new Error("Tapahtuma ei voi päättyä ennen kuin se alkaa.");
  }

  return {
    title,
    startsAt,
    endsAt,
    location,
    body,
    includeInZine: formData.get("includeInZine") === "on",
  };
}

/**
 * Every page that can show an event: the member's own list, the public
 * calendar, and the zine previews (whose upcoming DRAFT edition re-syncs
 * its items on render).
 */
function revalidateEventPages(eventId?: string): void {
  revalidatePath("/dashboard/tapahtumat");
  if (eventId) revalidatePath(`/dashboard/tapahtumat/${eventId}`);
  revalidatePath("/tapahtumat");
  revalidatePath("/");
  revalidatePath("/dashboard/lehti");
}

export async function createCommunityEvent(formData: FormData): Promise<void> {
  const user = await requireUser("MEMBER", "ADMIN");
  const fields = readEventFields(formData);

  const event = await prisma.communityEvent.create({
    data: { authorId: user.id, ...fields },
  });

  revalidateEventPages();
  redirect(`/dashboard/tapahtumat/${event.id}`);
}

export async function updateCommunityEvent(eventId: string, formData: FormData): Promise<void> {
  const user = await requireUser("MEMBER", "ADMIN");
  const event = await prisma.communityEvent.findUniqueOrThrow({ where: { id: eventId } });
  if (user.role !== "ADMIN" && event.authorId !== user.id) {
    throw new Error("Ei oikeutta muokata tätä tapahtumaa.");
  }

  await prisma.communityEvent.update({
    where: { id: event.id },
    data: readEventFields(formData),
  });

  revalidateEventPages(event.id);
}

export async function deleteCommunityEvent(eventId: string): Promise<void> {
  const user = await requireUser("MEMBER", "ADMIN");
  const event = await prisma.communityEvent.findUniqueOrThrow({ where: { id: eventId } });
  if (user.role !== "ADMIN" && event.authorId !== user.id) {
    throw new Error("Ei oikeutta poistaa tätä tapahtumaa.");
  }

  await prisma.communityEvent.delete({ where: { id: event.id } });

  revalidateEventPages();
  redirect("/dashboard/tapahtumat");
}
