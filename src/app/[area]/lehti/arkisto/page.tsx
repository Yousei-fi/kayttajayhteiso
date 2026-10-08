import Link from "next/link";
import { areaDb } from "@/lib/db";
import { areaPath, requireArea } from "@/lib/area";
import { formatDateRange } from "@/lib/week";

export default async function ArkistoPage({ params }: PageProps<"/[area]/lehti/arkisto">) {
  const area = await requireArea((await params).area);
  const editions = await areaDb(area.id).zineEdition.findMany({
    where: { status: "FINAL" },
    orderBy: { startDate: "desc" },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{area.nameGenitive} lehtien arkisto</h1>
      <ul className="flex flex-col gap-2">
        {editions.map((e) => (
          <li key={e.id} className="rounded border border-line bg-paper p-3">
            <Link href={areaPath(area, `/lehti/arkisto/${e.id}`)} className="font-semibold hover:underline">
              {formatDateRange(e.startDate, e.endDate)}
            </Link>
          </li>
        ))}
        {editions.length === 0 && <p className="text-sm text-muted">Ei vielä julkaistuja lehtiä.</p>}
      </ul>
    </main>
  );
}
