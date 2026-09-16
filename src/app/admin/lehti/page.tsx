import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSyncedUpcomingEdition } from "@/lib/zine";
import { formatDate, formatDateRange } from "@/lib/week";

export default async function LehdetPage() {
  await requireUser("ADMIN");
  await getSyncedUpcomingEdition();

  const editions = await prisma.zineEdition.findMany({ orderBy: { startDate: "desc" } });

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Lehdet</h1>
      <ul className="flex flex-col gap-2">
        {editions.map((e) => (
          <li key={e.id} className="flex items-center justify-between rounded border border-line bg-paper p-3">
            <div>
              <Link href={`/admin/lehti/${e.id}`} className="font-semibold hover:underline">
                {formatDateRange(e.startDate, e.endDate)}
              </Link>
              <p className="text-xs text-muted">
                {e.status === "DRAFT" ? "Luonnos" : `Julkaistu ${e.publishedAt ? formatDate(e.publishedAt) : ""}`}
                {e.pdfPath ? " · PDF valmis" : ""}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
