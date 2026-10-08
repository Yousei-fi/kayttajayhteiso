import { requireAreaUser } from "@/lib/auth";
import { formatDateTime, toDateTimeLocalValue } from "@/lib/week";
import { notFound } from "next/navigation";
import { updateCommunityEvent, deleteCommunityEvent } from "../actions";

export default async function TapahtumaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, db } = await requireAreaUser("MEMBER", "ADMIN");

  const event = await db.communityEvent.findUnique({ where: { id }, include: { author: true } });
  if (!event) notFound();

  const canEdit = user.role === "ADMIN" || event.authorId === user.id;
  const boundUpdate = updateCommunityEvent.bind(null, event.id);
  const boundDelete = deleteCommunityEvent.bind(null, event.id);

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-xl font-bold">{event.title}</h1>
      <p className="mb-4 text-xs text-muted">
        {formatDateTime(event.startsAt)} · lisännyt {event.author.name}
      </p>

      {!canEdit ? (
        <div className="rounded border border-line bg-paper p-4">
          {event.location && (
            <p className="mb-2 text-sm">
              <strong>Paikka:</strong> {event.location}
            </p>
          )}
          <p className="whitespace-pre-wrap text-sm">{event.body}</p>
        </div>
      ) : (
        <form action={boundUpdate} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Otsikko
            <input
              name="title"
              required
              defaultValue={event.title}
              className="rounded border border-line bg-paper px-3 py-2"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Alkaa
              <input
                type="datetime-local"
                name="startsAt"
                required
                defaultValue={toDateTimeLocalValue(event.startsAt)}
                className="rounded border border-line bg-paper px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Päättyy
              <input
                type="datetime-local"
                name="endsAt"
                defaultValue={event.endsAt ? toDateTimeLocalValue(event.endsAt) : ""}
                className="rounded border border-line bg-paper px-3 py-2"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Paikka
            <input
              name="location"
              defaultValue={event.location ?? ""}
              className="rounded border border-line bg-paper px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Kuvaus
            <textarea
              name="body"
              required
              rows={6}
              defaultValue={event.body}
              className="rounded border border-line bg-paper p-3 text-sm"
            />
          </label>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="includeInZine" defaultChecked={event.includeInZine} />
            Sisällytä lehteen
          </label>

          <button type="submit" className="rounded bg-accent px-4 py-2 font-semibold text-white">
            Tallenna
          </button>
        </form>
      )}

      {canEdit && (
        <form action={boundDelete} className="mt-4">
          <button type="submit" className="text-sm text-danger underline">
            Poista tapahtuma
          </button>
        </form>
      )}
    </div>
  );
}
