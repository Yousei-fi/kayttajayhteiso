import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/week";

export default async function JulkisetIlmoituksetPage() {
  const now = new Date();
  const alerts = await prisma.alert.findMany({
    where: { archived: false, OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
    orderBy: { createdAt: "desc" },
    include: { service: true },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Palveluiden ilmoitukset</h1>
      <p className="mb-6 text-sm text-muted">
        Tampereen päihde- ja matalan kynnyksen palveluiden lyhyet, ajankohtaiset ilmoitukset.
      </p>
      <ul className="flex flex-col gap-3">
        {alerts.map((a) => (
          <li key={a.id} className="rounded border border-line bg-paper p-4">
            <p className="text-xs uppercase tracking-wide text-accent-2">{a.service.serviceName || a.service.name}</p>
            <p className="text-lg font-semibold">{a.title}</p>
            <p className="mt-1 text-sm">{a.body}</p>
            {a.validUntil && (
              <p className="mt-1 text-xs text-muted">Voimassa {formatDate(a.validUntil)} asti</p>
            )}
          </li>
        ))}
        {alerts.length === 0 && <p className="text-sm text-muted">Ei ajankohtaisia ilmoituksia juuri nyt.</p>}
      </ul>
    </main>
  );
}
