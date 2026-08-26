import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { updateStreetRound, deleteStreetRound } from "../actions";
import { duplicateAsDraftFromRound } from "@/app/dashboard/artikkelit/actions";
import { formatDate } from "@/lib/week";
import { notFound } from "next/navigation";

export default async function KierrosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser("MEMBER", "ADMIN", "SERVICE");
  const round = await prisma.streetRound.findUnique({ where: { id }, include: { author: true } });
  if (!round) notFound();

  const canEdit =
    (user.role === "MEMBER" || user.role === "ADMIN") &&
    (user.role === "ADMIN" || round.authorId === user.id);
  const canTurnIntoArticle = user.role === "MEMBER" || user.role === "ADMIN";

  const boundUpdate = updateStreetRound.bind(null, round.id);
  const boundDelete = deleteStreetRound.bind(null, round.id);
  const boundDuplicate = duplicateAsDraftFromRound.bind(null, round.id);

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-xl font-bold">{formatDate(round.date)} {round.area ? `– ${round.area}` : ""}</h1>
      <p className="mb-4 text-xs text-muted">Kirjannut {round.author.name}</p>

      {canTurnIntoArticle && (
        <form action={boundDuplicate} className="mb-4">
          <button type="submit" className="rounded border border-accent-2 px-3 py-1.5 text-sm font-semibold text-accent-2">
            Tee tästä artikkeli
          </button>
        </form>
      )}

      {!canEdit ? (
        <div className="rounded border border-line bg-paper p-4">
          {round.participants && <p className="mb-2 text-sm"><strong>Osallistujat:</strong> {round.participants}</p>}
          <p className="whitespace-pre-wrap text-sm">{round.notes}</p>
        </div>
      ) : (
        <form action={boundUpdate} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Päivämäärä
            <input
              type="date"
              name="date"
              defaultValue={round.date.toISOString().slice(0, 10)}
              required
              className="rounded border border-line bg-paper px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Osallistujat
            <input name="participants" defaultValue={round.participants ?? ""} className="rounded border border-line bg-paper px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Alue / reitti
            <input name="area" defaultValue={round.area ?? ""} className="rounded border border-line bg-paper px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Muistiinpanot
            <textarea name="notes" required rows={10} defaultValue={round.notes} className="rounded border border-line bg-paper p-3 text-sm" />
          </label>
          <div className="flex items-center gap-3">
            <button type="submit" className="rounded bg-accent px-4 py-2 font-semibold text-white">
              Tallenna
            </button>
          </div>
        </form>
      )}

      {canEdit && (
        <form action={boundDelete} className="mt-4">
          <button type="submit" className="text-sm text-danger underline">
            Poista kierros
          </button>
        </form>
      )}
    </div>
  );
}
