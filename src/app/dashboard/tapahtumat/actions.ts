"use server";

import { requireAreaUser } from "@/lib/auth";
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
function revalidateEventPages(areaId: string, eventId?: string): void {
  revalidatePath("/dashboard/tapahtumat");
  if (eventId) revalidatePath(`/dashboard/tapahtumat/${eventId}`);
  revalidatePath(`/${areaId}/tapahtumat`);
  revalidatePath(`/${areaId}`);
  revalidatePath("/dashboard/lehti");
}

export async function createCommunityEvent(formData: FormData): Promise<void> {
  const { user, area, db } = await requireAreaUser("MEMBER", "ADMIN");
  const fields = readEventFields(formData);

  const event = await db.communityEvent.create({
    data: { areaId: area.id, authorId: user.id, ...fields },
  });

  revalidateEventPages(area.id);
  redirect(`/dashboard/tapahtumat/${event.id}`);
}

export async function updateCommunityEvent(eventId: string, formData: FormData): Promise<void> {
  const { user, db } = await requireAreaUser("MEMBER", "ADMIN");
  const event = await db.communityEvent.findUniqueOrThrow({ where: { id: eventId } });
  if (user.role !== "ADMIN" && event.authorId !== user.id) {
    throw new Error("Ei oikeutta muokata tätä tapahtumaa.");
  }

  await db.communityEvent.update({
    where: { id: event.id },
    data: readEventFields(formData),
  });

  revalidateEventPages(event.areaId, event.id);
}

export async function deleteCommunityEvent(eventId: string): Promise<void> {
  const { user, db } = await requireAreaUser("MEMBER", "ADMIN");
  const event = await db.communityEvent.findUniqueOrThrow({ where: { id: eventId } });
  if (user.role !== "ADMIN" && event.authorId !== user.id) {
    throw new Error("Ei oikeutta poistaa tätä tapahtumaa.");
  }

  await db.communityEvent.delete({ where: { id: event.id } });

  revalidateEventPages(event.areaId);
  redirect("/dashboard/tapahtumat");
}
