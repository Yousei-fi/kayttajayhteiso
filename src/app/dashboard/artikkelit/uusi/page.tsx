import { requireUser } from "@/lib/auth";
import { createArticle } from "../actions";
import { MarkdownEditor } from "@/components/markdown-editor";

export default async function UusiArtikkeliPage() {
  await requireUser("MEMBER", "ADMIN");

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-bold">Kirjoita artikkeli</h1>
      <form action={createArticle} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Otsikko
          <input name="title" required className="rounded border border-line bg-paper px-3 py-2" />
        </label>

        <MarkdownEditor name="body" />

        <label className="flex flex-col gap-1 text-sm font-medium">
          Kuva (valinnainen)
          <input type="file" name="image" accept="image/*" className="text-sm" />
        </label>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="includeInZine" defaultChecked />
          Ehdota tulevaan lehteen
        </label>

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
            Julkaise
          </button>
        </div>
      </form>
    </div>
  );
}
