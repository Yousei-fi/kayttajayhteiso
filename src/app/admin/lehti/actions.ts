"use server";

import { prisma } from "@/lib/db";
import { requireAreaUser, requireUser } from "@/lib/auth";
import { isNationalAdmin } from "@/lib/area";
import { syncEditionItems } from "@/lib/zine";
import { publishEdition, renderEditionPdf } from "@/lib/zine-publish";
import { revalidatePath } from "next/cache";

/**
 * An admin's edition in the area they are working in. Items are reached
 * through their edition, so an item of another area's paper is not found.
 */
async function requireEdition(editionId: string) {
  const { area, db } = await requireAreaUser("ADMIN");
  const edition = await db.zineEdition.findUniqueOrThrow({ where: { id: editionId } });
  return { area, edition };
}

async function requireItem(itemId: string) {
  const item = await prisma.zineItem.findUniqueOrThrow({ where: { id: itemId } });
  await requireEdition(item.editionId);
  return item;
}

function revalidateEditionPages(areaId: string, editionId: string): void {
  revalidatePath(`/admin/lehti/${editionId}`);
  revalidatePath(`/${areaId}/lehti`, "layout");
  revalidatePath(`/${areaId}`);
  revalidatePath("/");
}

/**
 * National admins only: keep an article out of every area's paper, or let it
 * back in. Every DRAFT edition is re-synced straight away, so all the
 * papers change together; FINAL editions keep what they printed.
 */
export async function setArticleExcludedFromZines(articleId: string, excluded: boolean): Promise<void> {
  const admin = await requireUser("ADMIN");
  if (!isNationalAdmin(admin)) {
    throw new Error("Vain valtakunnallinen ylläpitäjä voi poistaa artikkelin kaikista lehdistä.");
  }

  await prisma.article.update({ where: { id: articleId }, data: { excludedFromZines: excluded } });

  const drafts = await prisma.zineEdition.findMany({ where: { status: "DRAFT" } });
  for (const edition of drafts) {
    await syncEditionItems(edition);
    revalidatePath(`/admin/lehti/${edition.id}`);
  }
  revalidatePath("/admin/lehti");
  revalidatePath("/dashboard/lehti");
  revalidatePath(`/dashboard/artikkelit/${articleId}`);
}

export async function toggleItemExcluded(itemId: string): Promise<void> {
  const item = await requireItem(itemId);
  await prisma.zineItem.update({ where: { id: itemId }, data: { excluded: !item.excluded } });
  revalidatePath(`/admin/lehti/${item.editionId}`);
}

export async function moveItem(editionId: string, itemId: string, direction: "up" | "down"): Promise<void> {
  await requireEdition(editionId);
  const included = await prisma.zineItem.findMany({
    where: { editionId, excluded: false },
    orderBy: { sortOrder: "asc" },
  });
  const idx = included.findIndex((i) => i.id === itemId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= included.length) return;

  const a = included[idx];
  const b = included[swapIdx];
  await prisma.$transaction([
    prisma.zineItem.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
    prisma.zineItem.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
  ]);
  revalidatePath(`/admin/lehti/${editionId}`);
}

export async function finalizeEdition(editionId: string): Promise<void> {
  const { area, edition } = await requireEdition(editionId);
  await publishEdition(edition, area);
  revalidateEditionPages(edition.areaId, editionId);
}

export async function generateEditionPdf(editionId: string): Promise<void> {
  const { area, edition } = await requireEdition(editionId);
  await renderEditionPdf(edition.id, area);
  revalidateEditionPages(edition.areaId, editionId);
}
