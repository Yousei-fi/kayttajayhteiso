import { prisma } from "@/lib/db";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/week";
import { notFound } from "next/navigation";

export default async function ArtikkeliPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await prisma.article.findUnique({ where: { id }, include: { author: true } });
  if (!article || article.status !== "PUBLISHED") notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      {article.imagePath && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={article.imagePath} alt="" className="mb-4 max-h-80 w-full rounded object-cover" />
      )}
      <h1 className="text-2xl font-bold">{article.title}</h1>
      <p className="mb-6 text-sm text-muted">{article.author.name} · {formatDate(article.createdAt)}</p>
      <div className="prose-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(article.body) }} />
    </main>
  );
}
