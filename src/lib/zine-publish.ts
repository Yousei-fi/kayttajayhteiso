import "server-only";
import { prisma } from "@/lib/db";
import { syncEditionItems, getZineDirectorySections } from "@/lib/zine";
import { buildZineHtml } from "@/lib/zine-html";
import { renderZinePdf } from "@/lib/pdf";
import { getSiteSettings } from "@/lib/settings";
import type { Area, ZineEdition } from "@prisma/client";

/**
 * Locks a DRAFT edition with its final content and renders its PDF. Shared
 * by the admin's "Julkaise lehti" and the Sunday-morning schedule
 * (zine-schedule.ts); callers check who may do it.
 */
export async function publishEdition(edition: ZineEdition, area: Area): Promise<void> {
  if (edition.status !== "DRAFT") return;
  await syncEditionItems(edition);
  await prisma.zineEdition.update({
    where: { id: edition.id },
    data: { status: "FINAL", publishedAt: new Date() },
  });
  await renderEditionPdf(edition.id, area);
}

/** Renders (or re-renders) an edition's print PDF and records where it is. */
export async function renderEditionPdf(editionId: string, area: Area): Promise<string> {
  const [edition, settings] = await Promise.all([
    prisma.zineEdition.findUniqueOrThrow({
      where: { id: editionId },
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
  return pdfPath;
}
