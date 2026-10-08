import { ZINE_NAME } from "@/lib/zine-brand";
import { areaDb } from "@/lib/db";
import { requireArea } from "@/lib/area";
import { getSiteSettings } from "@/lib/settings";
import { buildZineHtml } from "@/lib/zine-html";
import { getZineDirectorySections } from "@/lib/zine";
import { formatDateRange } from "@/lib/week";
import { notFound } from "next/navigation";

export default async function ArkistoEditionPage({ params }: PageProps<"/[area]/lehti/arkisto/[id]">) {
  const { area: slug, id } = await params;
  const area = await requireArea(slug);
  const edition = await areaDb(area.id).zineEdition.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!edition || edition.status !== "FINAL") notFound();

  const [settings, { services, meetings }] = await Promise.all([
    getSiteSettings(),
    getZineDirectorySections(edition),
  ]);
  const html = await buildZineHtml({ edition, settings, area, services, meetings, mode: "preview" });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">{ZINE_NAME} {formatDateRange(edition.startDate, edition.endDate)}</h1>
      {edition.pdfPath && (
        <a href={edition.pdfPath} className="mb-4 inline-block text-sm text-accent-2 underline">
          Lataa PDF
        </a>
      )}
      <iframe title={ZINE_NAME} srcDoc={html} className="h-[85vh] w-full rounded border border-line bg-white" />
    </main>
  );
}
