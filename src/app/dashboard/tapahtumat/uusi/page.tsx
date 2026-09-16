import { requireUser } from "@/lib/auth";
import { toDateTimeLocalValue } from "@/lib/week";
import { createCommunityEvent } from "../actions";

/** Defaults the form to the next round hour, so only the day usually needs picking. */
function nextHour(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return toDateTimeLocalValue(d);
}

export default async function UusiTapahtumaPage() {
  await requireUser("MEMBER", "ADMIN");

  return (
    <div className="max-w-xl">
      <h1 className="mb-2 text-xl font-bold">Lisää kokous tai tapahtuma</h1>
      <p className="mb-4 text-sm text-muted">
        Yhteisön oma kokous, tapaaminen tai tapahtuma. Näkyy julkisella sivustolla ja tulee lehteen.
      </p>

      <form action={createCommunityEvent} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Otsikko
          <input
            name="title"
            required
            placeholder="esim. Yhteisön kuukausikokous"
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
              defaultValue={nextHour()}
              className="rounded border border-line bg-paper px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Päättyy (valinnainen)
            <input
              type="datetime-local"
              name="endsAt"
              className="rounded border border-line bg-paper px-3 py-2"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Paikka (valinnainen)
          <input
            name="location"
            placeholder="esim. Tullintori, kerhohuone"
            className="rounded border border-line bg-paper px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Kuvaus
          <textarea
            name="body"
            required
            rows={6}
            placeholder="Kenelle tapahtuma on, mitä siellä tehdään, tarvitseeko ilmoittautua."
            className="rounded border border-line bg-paper p-3 text-sm"
          />
        </label>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="includeInZine" defaultChecked />
          Sisällytä lehteen
        </label>

        <button type="submit" className="rounded bg-accent px-4 py-2 font-semibold text-white">
          Tallenna
        </button>
      </form>
    </div>
  );
}
