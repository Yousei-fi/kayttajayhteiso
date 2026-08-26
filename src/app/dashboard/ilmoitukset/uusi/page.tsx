import { requireUser } from "@/lib/auth";
import { createAlert } from "../actions";

export default async function UusiIlmoitusPage() {
  await requireUser("SERVICE", "ADMIN");

  return (
    <div className="max-w-md">
      <h1 className="mb-4 text-xl font-bold">Tee ilmoitus</h1>

      <form action={createAlert} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Otsikko
          <input
            name="title"
            required
            placeholder="esim. Poikkeusaukiolo"
            className="rounded border border-line bg-paper px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Teksti
          <textarea
            name="body"
            required
            rows={5}
            placeholder="esim. Suljemme poikkeuksellisesti klo 16 torstaina 3.9."
            className="rounded border border-line bg-paper p-3 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Voimassa (valinnainen)
          <input type="date" name="validUntil" className="rounded border border-line bg-paper px-3 py-2" />
        </label>

        <details className="text-sm text-muted">
          <summary className="cursor-pointer">Lisäasetukset</summary>
          <label className="mt-2 flex flex-col gap-1">
            Voimassa alkaen (valinnainen)
            <input type="date" name="validFrom" className="rounded border border-line bg-paper px-3 py-2" />
          </label>
        </details>

        <button type="submit" className="rounded bg-accent px-4 py-2 font-semibold text-white">
          Julkaise
        </button>
      </form>
    </div>
  );
}
