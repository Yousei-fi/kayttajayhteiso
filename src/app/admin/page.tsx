import Link from "next/link";
import { getSyncedUpcomingEdition } from "@/lib/zine";
import { formatDateRange } from "@/lib/week";

export default async function AdminHomePage() {
  const edition = await getSyncedUpcomingEdition();

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded border border-line bg-paper p-4">
        <p className="text-xs uppercase tracking-wide text-muted">Tuleva viikkolehti</p>
        <p className="text-xl font-bold">{formatDateRange(edition.startDate, edition.endDate)}</p>
        <Link
          href={`/admin/viikkolehti/${edition.id}`}
          className="mt-2 inline-block rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white"
        >
          Avaa ja viimeistele
        </Link>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/admin/kayttajat" className="rounded border border-line bg-paper p-4 font-semibold hover:border-accent-2">
          Käyttäjät
        </Link>
        <Link href="/admin/viikkolehti" className="rounded border border-line bg-paper p-4 font-semibold hover:border-accent-2">
          Viikkolehtien arkisto
        </Link>
        <Link href="/admin/asetukset" className="rounded border border-line bg-paper p-4 font-semibold hover:border-accent-2">
          Asetukset ja brändäys
        </Link>
      </div>
    </div>
  );
}
