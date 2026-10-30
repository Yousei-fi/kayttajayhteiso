import { prisma } from "@/lib/db";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate, formatDateTime } from "@/lib/week";
import { notFound } from "next/navigation";
import { CommentForm } from "@/components/comment-form";
import { addArticleComment } from "./actions";

export default async function ArtikkeliPage({ params }: PageProps<"/artikkelit/[id]">) {
  const { id } = await params;
  const article = await prisma.article.findUnique({
    where: { id },
    include: { author: true, comments: { orderBy: { createdAt: "asc" } } },
  });
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

      <section id="kommentit" className="mt-12 border-t border-line pt-6">
        <h2 className="mb-4 text-lg font-bold">Kommentit ({article.comments.length})</h2>
        <div className="mb-8 flex flex-col gap-3">
          {article.comments.map((c) => (
            <article key={c.id} className="rounded border border-line bg-paper p-3">
              <header className="mb-1 flex flex-wrap items-baseline gap-x-2 text-xs text-muted">
                <span className="text-sm font-semibold text-foreground">{c.nickname || "Nimetön"}</span>
                <time dateTime={c.createdAt.toISOString()}>{formatDateTime(c.createdAt)}</time>
              </header>
              <p className="whitespace-pre-line text-sm leading-relaxed">{c.body}</p>
            </article>
          ))}
          {article.comments.length === 0 && <p className="text-sm text-muted">Ei vielä kommentteja.</p>}
        </div>
        <h3 className="mb-2 font-bold">Kommentoi</h3>
        <CommentForm action={addArticleComment.bind(null, article.id)} />
      </section>
    </main>
  );
}
