"use client";

import { useActionState, useState } from "react";
import { EXPERIENCE_MAX_LENGTH, type ExperienceFormState } from "@/lib/experience-format";

export type ServiceOption = { id: string; name: string; category: string };

/**
 * Posting an experience. With `services` the poster also picks which
 * service it is about (the board); without, the page already decides (a
 * service's own page).
 */
export function ExperienceForm({
  action,
  services,
}: {
  action: (prev: ExperienceFormState, formData: FormData) => Promise<ExperienceFormState>;
  services?: ServiceOption[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [value, setValue] = useState("");
  // Empty the text once it is posted, but keep it when posting failed.
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state.ok) setValue("");
  }

  const byCategory = new Map<string, ServiceOption[]>();
  for (const s of services ?? []) byCategory.set(s.category, [...(byCategory.get(s.category) ?? []), s]);

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded border border-danger bg-red-50 px-3 py-2 text-sm font-medium text-danger">
        HUOM! Älä jaa yksityisiä tietoja tai vihapuhetta. IP-osoitteesi tallennetaan.
      </p>

      <form action={formAction} className="flex flex-col gap-2">
        {services && (
          <select name="serviceId" required defaultValue="" className="rounded border border-line bg-paper p-2 text-sm">
            <option value="" disabled>
              Mistä palvelusta kerrot?
            </option>
            {[...byCategory].map(([category, group]) => (
              <optgroup key={category} label={category}>
                {group.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}
        <textarea
          name="body"
          required
          maxLength={EXPERIENCE_MAX_LENGTH}
          rows={5}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Miten sinua kohdeltiin? Mitä sait, mitä jäi puuttumaan? Mitä muiden kannattaa tietää ennen kuin menevät?"
          className="rounded border border-line bg-paper p-3 text-sm"
        />
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.ok && !state.error && <p className="text-sm text-accent-2">Kiitos! Kokemuksesi on julkaistu.</p>}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">
            {value.length} / {EXPERIENCE_MAX_LENGTH}
          </span>
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-accent px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Lähetetään…" : "Julkaise"}
          </button>
        </div>
      </form>
    </div>
  );
}
