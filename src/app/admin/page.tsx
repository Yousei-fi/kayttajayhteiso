import Link from "next/link";
import { requireAreaUser } from "@/lib/auth";
import { getSyncedUpcomingEdition } from "@/lib/zine";
import { formatDateRange } from "@/lib/week";

export default async function AdminHomePage() {
  const { area } = await requireAreaUser("ADMIN");
  const edition = await getSyncedUpcomingEdition(area);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded border border-line bg-paper p-4">
        <p className="text-xs uppercase tracking-wide text-muted">Tuleva lehti · {area.name}</p>
        <p className="text-xl font-bold">{formatDateRange(edition.startDate, edition.endDate)}</p>
        <Link
          href={`/admin/lehti/${edition.id}`}
          className="mt-2 inline-block rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white"
        >
          Avaa ja viimeistele
        </Link>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/kayttajat" className="rounded border border-line bg-paper p-4 font-semibold hover:border-accent-2">
          Käyttäjät
        </Link>
        <Link href="/admin/lehti" className="rounded border border-line bg-paper p-4 font-semibold hover:border-accent-2">
          Lehtien arkisto
        </Link>
        <Link href="/admin/kokemukset" className="rounded border border-line bg-paper p-4 font-semibold hover:border-accent-2">
          Kokemukset ({area.nameGenitive} palvelut)
        </Link>
        <Link href="/admin/asetukset" className="rounded border border-line bg-paper p-4 font-semibold hover:border-accent-2">
          Asetukset ja brändäys
        </Link>
      </div>
    </div>
  );
}
