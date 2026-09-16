import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/lib/settings";
import { buildZineHtml } from "@/lib/zine-html";
import { getZineDirectorySections } from "@/lib/zine";
import { formatDateRange } from "@/lib/week";
import { ZINE_NAME, ZINE_TAGLINE } from "@/lib/zine-brand";
import { CandleMark } from "@/components/icons";

export default async function LehtiPage() {
  const edition = await prisma.zineEdition.findFirst({
    where: { status: "FINAL" },
    orderBy: { startDate: "desc" },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  if (!edition) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-bold">{ZINE_NAME}</h1>
        <p className="text-sm text-muted">Ensimmäistä lehteä ei ole vielä julkaistu.</p>
      </main>
    );
  }

  const [settings, { services, meetings }] = await Promise.all([
    getSiteSettings(),
    getZineDirectorySections(edition.startDate, edition.endDate),
  ]);
  const html = await buildZineHtml({ edition, settings, services, meetings, mode: "preview" });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CandleMark className="h-10 w-auto text-accent" />
          <div>
            <h1 className="text-2xl font-bold">{ZINE_NAME}</h1>
            <p className="text-xs uppercase tracking-wide text-muted">
              {ZINE_TAGLINE} · {formatDateRange(edition.startDate, edition.endDate)}
            </p>
          </div>
        </div>
        <Link href="/lehti/arkisto" className="text-sm text-accent-2 underline">Arkisto</Link>
      </div>
      {edition.pdfPath && (
        <a href={edition.pdfPath} className="mb-4 inline-block text-sm text-accent-2 underline">
          Lataa PDF
        </a>
      )}
      <iframe title={ZINE_NAME} srcDoc={html} className="h-[85vh] w-full rounded border border-line bg-white" />
    </main>
  );
}
