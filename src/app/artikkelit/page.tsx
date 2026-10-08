import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/week";

export default async function JulkisetArtikkelitPage() {
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    include: { author: true },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Artikkelit</h1>
      <p className="mb-6 text-sm text-muted">Käyttäjäyhteisön jäsenten kirjoituksia kaikilta alueilta.</p>
      <ul className="flex flex-col gap-4">
        {articles.map((a) => (
          <li key={a.id} className="rounded border border-line bg-paper p-4">
            {a.imagePath && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.imagePath} alt="" className="mb-3 max-h-56 w-full rounded object-cover" />
            )}
            <Link href={`/artikkelit/${a.id}`} className="text-lg font-semibold hover:underline">
              {a.title}
            </Link>
            <p className="text-xs text-muted">{a.author.name} · {formatDate(a.createdAt)}</p>
          </li>
        ))}
        {articles.length === 0 && <p className="text-sm text-muted">Ei vielä julkaistuja artikkeleita.</p>}
      </ul>
    </main>
  );
}
