import { setWorkingArea } from "@/app/dashboard/actions";
import type { Area } from "@prisma/client";

/** For national admins: which area the dashboard and admin pages work in. */
export function AreaSwitcher({ areas, current }: { areas: Area[]; current: string }) {
  return (
    <form action={setWorkingArea} className="mt-1 flex items-center gap-2 text-xs">
      <label htmlFor="working-area" className="text-muted">
        Työskentelyalue
      </label>
      <select
        id="working-area"
        name="area"
        defaultValue={current}
        className="rounded border border-line bg-paper px-1 py-0.5"
      >
        {areas.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
            {a.active ? "" : " (ei julkaistu)"}
          </option>
        ))}
      </select>
      <button type="submit" className="rounded border border-line px-2 py-0.5 font-semibold">
        Vaihda
      </button>
    </form>
  );
}
