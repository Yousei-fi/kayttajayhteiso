import { requireUser } from "@/lib/auth";
import { createStreetRound } from "../actions";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function UusiKierrosPage() {
  await requireUser("MEMBER", "ADMIN");

  return (
    <div className="max-w-xl">
      <h1 className="mb-2 text-xl font-bold">Kirjaa katukierros</h1>
      <p className="mb-4 rounded bg-yellow-50 p-3 text-sm font-medium">
        Älä kirjaa tunnistettavia henkilötietoja.
      </p>

      <form action={createStreetRound} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Päivämäärä
          <input
            type="date"
            name="date"
            defaultValue={todayIso()}
            required
            className="rounded border border-line bg-paper px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Osallistujat (valinnainen)
          <input name="participants" className="rounded border border-line bg-paper px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Alue / reitti (valinnainen)
          <input name="area" placeholder="esim. Keskusta / Tullintori" className="rounded border border-line bg-paper px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Muistiinpanot, havainnot, mitä ihmiset kertoivat
          <textarea
            name="notes"
            required
            rows={10}
            placeholder="esim. Jaettiin 35 lehteä. Useampi mainitsi X-palvelun pitkät jonot. Kaksi kysyi haavanhoidosta. Kiinnostusta naloksonikoulutukseen."
            className="rounded border border-line bg-paper p-3 text-sm"
          />
        </label>

        <button type="submit" className="rounded bg-accent px-4 py-2 font-semibold text-white">
          Tallenna
        </button>
      </form>
    </div>
  );
}
