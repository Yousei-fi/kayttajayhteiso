"use server";

import { prisma } from "@/lib/db";
import { requireAreaUser } from "@/lib/auth";
import { syncEditionItems, getZineDirectorySections } from "@/lib/zine";
import { buildZineHtml } from "@/lib/zine-html";
import { renderZinePdf } from "@/lib/pdf";
import { getSiteSettings } from "@/lib/settings";
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
  const { edition } = await requireEdition(editionId);
  if (edition.status !== "DRAFT") return;

  await syncEditionItems(edition);
  await prisma.zineEdition.update({
    where: { id: edition.id },
    data: { status: "FINAL", publishedAt: new Date() },
  });

  revalidateEditionPages(edition.areaId, editionId);
}

export async function generateEditionPdf(editionId: string): Promise<void> {
  const { area, edition: found } = await requireEdition(editionId);
  const [edition, settings] = await Promise.all([
    prisma.zineEdition.findUniqueOrThrow({
      where: { id: found.id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    getSiteSettings(),
  ]);
  const { services, meetings } = await getZineDirectorySections(edition);

  const html = await buildZineHtml({
    edition,
    settings,
    area,
    services,
    meetings,
    mode: "print",
    assetBaseUrl: process.env.APP_URL ?? "http://localhost:3000",
  });

  const filename = `kynttila-pimeydessa-${area.id}-${edition.startDate.toISOString().slice(0, 10)}.pdf`;
  const pdfPath = await renderZinePdf(html, area.id, filename);

  await prisma.zineEdition.update({ where: { id: edition.id }, data: { pdfPath } });

  revalidateEditionPages(edition.areaId, editionId);
}
