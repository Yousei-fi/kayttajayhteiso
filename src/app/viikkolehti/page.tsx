import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/lib/settings";
import { buildZineHtml } from "@/lib/zine-html";
import { formatDateRange } from "@/lib/week";

export default async function ViikkolehtiPage() {
  const edition = await prisma.zineEdition.findFirst({
    where: { status: "FINAL" },
    orderBy: { startDate: "desc" },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  if (!edition) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-bold">Viikkolehti</h1>
        <p className="text-sm text-muted">Ensimmäistä lehteä ei ole vielä julkaistu.</p>
      </main>
    );
  }

  const settings = await getSiteSettings();
  const html = buildZineHtml({ edition, settings, mode: "preview" });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Viikkolehti {formatDateRange(edition.startDate, edition.endDate)}</h1>
        <Link href="/viikkolehti/arkisto" className="text-sm text-accent-2 underline">Arkisto</Link>
      </div>
      {edition.pdfPath && (
        <a href={edition.pdfPath} className="mb-4 inline-block text-sm text-accent-2 underline">
          Lataa PDF
        </a>
      )}
      <iframe title="Viikkolehti" srcDoc={html} className="h-[85vh] w-full rounded border border-line bg-white" />
    </main>
  );
}
