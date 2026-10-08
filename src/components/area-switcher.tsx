"use client";

import { usePathname } from "next/navigation";
import { setWorkingArea } from "@/app/dashboard/actions";
import type { Area } from "@prisma/client";

/**
 * For national admins: which area the dashboard and admin pages work in.
 * Switches as soon as an area is picked. Keyed on the current area so the
 * select shows the new one afterwards rather than React's form reset
 * putting the old one back.
 */
export function AreaSwitcher({ areas, current }: { areas: Area[]; current: string }) {
  const pathname = usePathname();
  return (
    <form key={current} action={setWorkingArea} className="mt-1 flex items-center gap-2 text-xs">
      <input type="hidden" name="from" value={pathname} />
      <label htmlFor="working-area" className="text-muted">
        Työskentelyalue
      </label>
      <select
        id="working-area"
        name="area"
        defaultValue={current}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded border border-line bg-paper px-1 py-0.5"
      >
        {areas.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
            {a.active ? "" : " (ei julkaistu)"}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="rounded border border-line px-2 py-0.5 font-semibold">
          Vaihda
        </button>
      </noscript>
    </form>
  );
}
