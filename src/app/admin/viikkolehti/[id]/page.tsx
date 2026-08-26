import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSiteSettings } from "@/lib/settings";
import { buildZineHtml } from "@/lib/zine-html";
import { syncEditionItems } from "@/lib/zine";
import { formatDateRange } from "@/lib/week";
import { notFound } from "next/navigation";
import {
  toggleItemExcluded,
  moveItem,
  updateCoverNote,
  finalizeEdition,
  generateEditionPdf,
} from "../actions";

export default async function ViikkolehtiEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireUser("ADMIN");

  const edition = await prisma.zineEdition.findUnique({ where: { id } });
  if (!edition) notFound();

  if (edition.status === "DRAFT") {
    await syncEditionItems(edition.id, edition.startDate);
  }

  const [items, settings] = await Promise.all([
    prisma.zineItem.findMany({ where: { editionId: edition.id }, orderBy: { sortOrder: "asc" } }),
    getSiteSettings(),
  ]);
  const included = items.filter((i) => !i.excluded);
  const excluded = items.filter((i) => i.excluded);

  const html = buildZineHtml({ edition: { ...edition, items }, settings, mode: "preview" });
  const boundMoveUp = (itemId: string) => moveItem.bind(null, edition.id, itemId, "up");
  const boundMoveDown = (itemId: string) => moveItem.bind(null, edition.id, itemId, "down");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{formatDateRange(edition.startDate, edition.endDate)}</h1>
          <p className="text-sm text-muted">
            {edition.status === "DRAFT" ? "Luonnos – päivittyy automaattisesti" : "Julkaistu ja lukittu"}
          </p>
        </div>
        <div className="flex gap-3">
          {edition.status === "DRAFT" ? (
            <form action={finalizeEdition.bind(null, edition.id)}>
              <button type="submit" className="rounded bg-accent px-4 py-2 font-semibold text-white">
                Julkaise lehti
              </button>
            </form>
          ) : (
            <form action={generateEditionPdf.bind(null, edition.id)}>
              <button type="submit" className="rounded bg-accent-2 px-4 py-2 font-semibold text-white">
                Luo PDF
              </button>
            </form>
          )}
        </div>
      </div>

      {edition.pdfPath && (
        <a href={edition.pdfPath} target="_blank" rel="noreferrer" className="text-sm text-accent-2 underline">
          Lataa viimeisin PDF
        </a>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <section>
            <h2 className="mb-2 font-bold">Kansilehden teksti (valinnainen)</h2>
            <form action={updateCoverNote.bind(null, edition.id)} className="flex gap-2">
              <input
                name="coverNote"
                defaultValue={edition.coverNote ?? ""}
                placeholder="Lyhyt teksti kanteen"
                className="flex-1 rounded border border-line bg-paper px-3 py-2 text-sm"
                disabled={edition.status !== "DRAFT"}
              />
              {edition.status === "DRAFT" && (
                <button type="submit" className="rounded border border-line px-3 py-2 text-sm font-semibold">
                  Tallenna
                </button>
              )}
            </form>
          </section>

          <section>
            <h2 className="mb-2 font-bold">Sisältö lehdessä ({included.length})</h2>
            <ul className="flex flex-col gap-2">
              {included.map((item, idx) => (
                <li key={item.id} className="rounded border border-line bg-paper p-3">
                  <p className="text-xs uppercase tracking-wide text-accent-2">
                    {item.contentType === "ALERT" ? "Ilmoitus" : "Artikkeli"} · {item.authorSnapshot}
                  </p>
                  <p className="font-semibold">{item.titleSnapshot}</p>
                  {edition.status === "DRAFT" && (
                    <div className="mt-2 flex gap-3 text-xs">
                      <form action={boundMoveUp(item.id)}>
                        <button type="submit" disabled={idx === 0} className="underline disabled:opacity-30">
                          Ylös
                        </button>
                      </form>
                      <form action={boundMoveDown(item.id)}>
                        <button type="submit" disabled={idx === included.length - 1} className="underline disabled:opacity-30">
                          Alas
                        </button>
                      </form>
                      <form action={toggleItemExcluded.bind(null, item.id)}>
                        <button type="submit" className="text-accent underline">
                          Poista lehdestä
                        </button>
                      </form>
                    </div>
                  )}
                </li>
              ))}
              {included.length === 0 && (
                <p className="text-sm text-muted">
                  Ei vielä sisältöä. Ilmoitukset ja lehteen merkityt artikkelit ilmestyvät tähän automaattisesti.
                </p>
              )}
            </ul>
          </section>

          {excluded.length > 0 && edition.status === "DRAFT" && (
            <section>
              <h2 className="mb-2 font-bold text-muted">Poistettu tästä lehdestä ({excluded.length})</h2>
              <ul className="flex flex-col gap-2">
                {excluded.map((item) => (
                  <li key={item.id} className="flex items-center justify-between rounded border border-line bg-paper p-3 opacity-60">
                    <p>{item.titleSnapshot}</p>
                    <form action={toggleItemExcluded.bind(null, item.id)}>
                      <button type="submit" className="text-xs text-accent-2 underline">
                        Palauta
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div>
          <h2 className="mb-2 font-bold">Esikatselu</h2>
          <iframe title="Esikatselu" srcDoc={html} className="h-[80vh] w-full rounded border border-line bg-white" />
        </div>
      </div>
    </div>
  );
}
