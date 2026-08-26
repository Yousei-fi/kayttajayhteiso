import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/lib/settings";
import { buildZineHtml } from "@/lib/zine-html";
import { formatDateRange } from "@/lib/week";
import { notFound } from "next/navigation";

export default async function ArkistoEditionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const edition = await prisma.zineEdition.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!edition || edition.status !== "FINAL") notFound();

  const settings = await getSiteSettings();
  const html = buildZineHtml({ edition, settings, mode: "preview" });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">Viikkolehti {formatDateRange(edition.startDate, edition.endDate)}</h1>
      {edition.pdfPath && (
        <a href={edition.pdfPath} className="mb-4 inline-block text-sm text-accent-2 underline">
          Lataa PDF
        </a>
      )}
      <iframe title="Viikkolehti" srcDoc={html} className="h-[85vh] w-full rounded border border-line bg-white" />
    </main>
  );
}
