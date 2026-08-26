import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/week";

export default async function ArtikkelitPage() {
  const user = await requireUser("MEMBER", "ADMIN");

  const articles = await prisma.article.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: true },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Artikkelit</h1>
        <Link href="/dashboard/artikkelit/uusi" className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white">
          Kirjoita artikkeli
        </Link>
      </div>

      <ul className="flex flex-col gap-2">
        {articles.map((a) => (
          <li key={a.id} className="flex items-center justify-between rounded border border-line bg-paper p-3">
            <div>
              <Link href={`/dashboard/artikkelit/${a.id}`} className="font-semibold hover:underline">
                {a.title}
              </Link>
              <p className="text-xs text-muted">
                {a.author.name} · {formatDate(a.createdAt)} ·{" "}
                {a.status === "PUBLISHED" ? "Julkaistu" : "Luonnos"}
                {a.includeInZine ? " · Lehteen" : ""}
                {a.authorId === user.id ? "" : " · toisen kirjoittama"}
              </p>
            </div>
          </li>
        ))}
        {articles.length === 0 && <p className="text-sm text-muted">Ei artikkeleita vielä.</p>}
      </ul>
    </div>
  );
}
