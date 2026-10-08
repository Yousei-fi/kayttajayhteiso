import { requireAreaUser } from "@/lib/auth";
import { updateAlert, deleteAlert, archiveAlert, duplicateAlert } from "../actions";
import { notFound } from "next/navigation";

function toDateInput(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export default async function MuokkaaIlmoitustaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, db } = await requireAreaUser("SERVICE", "ADMIN");
  const alert = await db.alert.findUnique({ where: { id } });
  if (!alert) notFound();
  if (user.role !== "ADMIN" && alert.serviceUserId !== user.id) {
    return <p className="text-sm text-danger">Ei oikeutta muokata tätä ilmoitusta.</p>;
  }

  const boundUpdate = updateAlert.bind(null, alert.id);

  return (
    <div className="max-w-md">
      <h1 className="mb-4 text-xl font-bold">Muokkaa ilmoitusta</h1>

      <form action={boundUpdate} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Otsikko
          <input name="title" defaultValue={alert.title} required className="rounded border border-line bg-paper px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Teksti
          <textarea name="body" defaultValue={alert.body} required rows={5} className="rounded border border-line bg-paper p-3 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Voimassa alkaen
          <input type="date" name="validFrom" defaultValue={toDateInput(alert.validFrom)} className="rounded border border-line bg-paper px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Voimassa asti
          <input type="date" name="validUntil" defaultValue={toDateInput(alert.validUntil)} className="rounded border border-line bg-paper px-3 py-2" />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="includeInZine" defaultChecked={alert.includeInZine} />
          Sisällytä tulevaan lehteen
        </label>

        <button type="submit" className="rounded bg-accent px-4 py-2 font-semibold text-white">
          Tallenna
        </button>
      </form>

      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <form action={duplicateAlert.bind(null, alert.id)}>
          <button type="submit" className="text-accent-2 underline">Kahdenna</button>
        </form>
        {!alert.archived && (
          <form action={archiveAlert.bind(null, alert.id)}>
            <button type="submit" className="text-muted underline">Arkistoi</button>
          </form>
        )}
        <form action={deleteAlert.bind(null, alert.id)}>
          <button type="submit" className="text-danger underline">Poista</button>
        </form>
      </div>
    </div>
  );
}
