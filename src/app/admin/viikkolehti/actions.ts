"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { syncEditionItems, getZineDirectorySections } from "@/lib/zine";
import { buildZineHtml } from "@/lib/zine-html";
import { renderZinePdf } from "@/lib/pdf";
import { getSiteSettings } from "@/lib/settings";
import { revalidatePath } from "next/cache";

export async function toggleItemExcluded(itemId: string): Promise<void> {
  await requireUser("ADMIN");
  const item = await prisma.zineItem.findUniqueOrThrow({ where: { id: itemId } });
  await prisma.zineItem.update({ where: { id: itemId }, data: { excluded: !item.excluded } });
  revalidatePath(`/admin/viikkolehti/${item.editionId}`);
}

export async function moveItem(editionId: string, itemId: string, direction: "up" | "down"): Promise<void> {
  await requireUser("ADMIN");
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
  revalidatePath(`/admin/viikkolehti/${editionId}`);
}

export async function finalizeEdition(editionId: string): Promise<void> {
  await requireUser("ADMIN");
  const edition = await prisma.zineEdition.findUniqueOrThrow({ where: { id: editionId } });
  if (edition.status !== "DRAFT") return;

  await syncEditionItems(edition.id, edition.startDate);
  await prisma.zineEdition.update({
    where: { id: edition.id },
    data: { status: "FINAL", publishedAt: new Date() },
  });

  revalidatePath(`/admin/viikkolehti/${editionId}`);
  revalidatePath("/viikkolehti");
  revalidatePath("/viikkolehti/arkisto");
}

export async function generateEditionPdf(editionId: string): Promise<void> {
  await requireUser("ADMIN");
  const [edition, settings] = await Promise.all([
    prisma.zineEdition.findUniqueOrThrow({
      where: { id: editionId },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    getSiteSettings(),
  ]);
  const { services, meetings } = await getZineDirectorySections(edition.startDate, edition.endDate);

  const html = await buildZineHtml({
    edition,
    settings,
    services,
    meetings,
    mode: "print",
    assetBaseUrl: process.env.APP_URL ?? "http://localhost:3000",
  });

  const filename = `viikkolehti-${edition.startDate.toISOString().slice(0, 10)}.pdf`;
  const pdfPath = await renderZinePdf(html, filename);

  await prisma.zineEdition.update({ where: { id: edition.id }, data: { pdfPath } });

  revalidatePath(`/admin/viikkolehti/${editionId}`);
  revalidatePath("/viikkolehti");
  revalidatePath("/viikkolehti/arkisto");
}
