import { ZINE_NAME } from "@/lib/zine-brand";
import { requireAreaUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSyncedUpcomingEdition, getZineDirectorySections } from "@/lib/zine";
import { getSiteSettings } from "@/lib/settings";
import { buildZineHtml } from "@/lib/zine-html";
import { formatDateRange } from "@/lib/week";
import Link from "next/link";

export default async function TulevaLehtiPage() {
  const { user, area } = await requireAreaUser("MEMBER", "SERVICE", "ADMIN");
  const edition = await getSyncedUpcomingEdition(area);
  const [items, settings, { services, meetings }] = await Promise.all([
    prisma.zineItem.findMany({ where: { editionId: edition.id }, orderBy: { sortOrder: "asc" } }),
    getSiteSettings(),
    getZineDirectorySections(edition),
  ]);

  const html = await buildZineHtml({ edition: { ...edition, items }, settings, area, services, meetings, mode: "preview" });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">
          Tuleva {ZINE_NAME}, {area.name} {formatDateRange(edition.startDate, edition.endDate)}
        </h1>
        {user.role === "ADMIN" && (
          <Link href={`/admin/lehti/${edition.id}`} className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white">
            Muokkaa lehteä
          </Link>
        )}
      </div>
      <p className="mb-4 text-sm text-muted">
        Esikatselu päivittyy automaattisesti, kun palvelut lisäävät ilmoituksia ja jäsenet julkaisevat artikkeleita lehteen.
      </p>
      <iframe title="Lehden esikatselu" srcDoc={html} className="h-[80vh] w-full rounded border border-line bg-white" />
    </div>
  );
}
