import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSyncedUpcomingEdition } from "@/lib/zine";
import { getSiteSettings } from "@/lib/settings";
import { buildZineHtml } from "@/lib/zine-html";
import { formatDateRange } from "@/lib/week";
import Link from "next/link";

export default async function TulevaViikkolehtiPage() {
  const user = await requireUser("MEMBER", "SERVICE", "ADMIN");
  const edition = await getSyncedUpcomingEdition();
  const [items, settings] = await Promise.all([
    prisma.zineItem.findMany({ where: { editionId: edition.id }, orderBy: { sortOrder: "asc" } }),
    getSiteSettings(),
  ]);

  const html = buildZineHtml({ edition: { ...edition, items }, settings, mode: "preview" });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">
          Tuleva viikkolehti {formatDateRange(edition.startDate, edition.endDate)}
        </h1>
        {user.role === "ADMIN" && (
          <Link href={`/admin/viikkolehti/${edition.id}`} className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white">
            Muokkaa lehteä
          </Link>
        )}
      </div>
      <p className="mb-4 text-sm text-muted">
        Esikatselu päivittyy automaattisesti, kun palvelut lisäävät ilmoituksia ja jäsenet julkaisevat artikkeleita lehteen.
      </p>
      <iframe title="Viikkolehden esikatselu" srcDoc={html} className="h-[80vh] w-full rounded border border-line bg-white" />
    </div>
  );
}
