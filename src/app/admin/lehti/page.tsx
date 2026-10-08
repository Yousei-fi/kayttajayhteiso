import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAreaUser } from "@/lib/auth";
import { isNationalAdmin } from "@/lib/area";
import { getSyncedUpcomingEdition } from "@/lib/zine";
import { setArticleExcludedFromZines } from "./actions";
import { formatDate, formatDateRange } from "@/lib/week";

export default async function LehdetPage() {
  const { user, area, db } = await requireAreaUser("ADMIN");
  await getSyncedUpcomingEdition(area);

  const [editions, excludedArticles] = await Promise.all([
    db.zineEdition.findMany({ orderBy: { startDate: "desc" } }),
    isNationalAdmin(user)
      ? prisma.article.findMany({
          where: { excludedFromZines: true },
          orderBy: { createdAt: "desc" },
          include: { author: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">{area.nameGenitive} lehdet</h1>
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

      {excludedArticles.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-1 text-lg font-bold">Kaikista lehdistä poistetut artikkelit</h2>
          <p className="mb-3 text-sm text-muted">
            Näkyvät edelleen sivustolla, mutta eivät minkään alueen lehdessä. Palautettu artikkeli palaa
            luonnoslehtiin, jos se on yhä lehden aikaikkunassa.
          </p>
          <ul className="flex flex-col gap-2">
            {excludedArticles.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded border border-line bg-paper p-3">
                <div>
                  <Link href={`/artikkelit/${a.id}`} className="font-semibold hover:underline">
                    {a.title}
                  </Link>
                  <p className="text-xs text-muted">
                    {a.author.name} · {formatDate(a.createdAt)}
                  </p>
                </div>
                <form action={setArticleExcludedFromZines.bind(null, a.id, false)}>
                  <button type="submit" className="text-sm text-accent-2 underline">
                    Palauta lehtiin
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
