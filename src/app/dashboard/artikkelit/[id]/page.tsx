import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { updateArticle, deleteArticle } from "../actions";
import { MarkdownEditor } from "@/components/markdown-editor";
import { notFound } from "next/navigation";

export default async function MuokkaaArtikkeliaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser("MEMBER", "ADMIN");
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) notFound();

  const canEdit = user.role === "ADMIN" || article.authorId === user.id;
  const boundUpdate = updateArticle.bind(null, article.id);
  const boundDelete = deleteArticle.bind(null, article.id);

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-bold">Muokkaa artikkelia</h1>

      {!canEdit && (
        <p className="mb-4 rounded bg-yellow-50 p-3 text-sm">
          Tämän on kirjoittanut toinen jäsen, joten et voi muokata sitä.
        </p>
      )}

      <form action={boundUpdate} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Otsikko
          <input
            name="title"
            defaultValue={article.title}
            required
            disabled={!canEdit}
            className="rounded border border-line bg-paper px-3 py-2 disabled:opacity-60"
          />
        </label>

        <MarkdownEditor name="body" defaultValue={article.body} />

        {article.imagePath && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={article.imagePath} alt="" className="max-h-48 rounded" />
        )}
        <label className="flex flex-col gap-1 text-sm font-medium">
          Vaihda kuva (valinnainen)
          <input type="file" name="image" accept="image/*" disabled={!canEdit} className="text-sm" />
        </label>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="includeInZine"
            defaultChecked={article.includeInZine}
            disabled={!canEdit}
          />
          Ehdota tulevaan viikkolehteen
        </label>

        {canEdit && (
          <div className="flex gap-3">
            <button
              type="submit"
              name="status"
              value="DRAFT"
              className="rounded border border-line px-4 py-2 font-semibold"
            >
              Tallenna luonnoksena
            </button>
            <button
              type="submit"
              name="status"
              value="PUBLISHED"
              className="rounded bg-accent px-4 py-2 font-semibold text-white"
            >
              {article.status === "PUBLISHED" ? "Tallenna" : "Julkaise"}
            </button>
          </div>
        )}
      </form>

      {canEdit && (
        <form action={boundDelete} className="mt-6">
          <button type="submit" className="text-sm text-accent underline">
            Poista artikkeli
          </button>
        </form>
      )}
    </div>
  );
}
