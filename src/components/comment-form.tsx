"use client";

import { useActionState, useState } from "react";
import { EXPERIENCE_MAX_LENGTH, type ExperienceFormState } from "@/lib/experience-format";

export function CommentForm({
  action,
}: {
  action: (prev: ExperienceFormState, formData: FormData) => Promise<ExperienceFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [value, setValue] = useState("");
  // Empty the text once it is posted, but keep it when posting failed.
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state.ok) setValue("");
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded border border-danger bg-red-50 px-3 py-2 text-sm font-medium text-danger">
        HUOM! Älä jaa yksityisiä tietoja tai vihapuhetta. IP-osoitteesi tallennetaan.
      </p>
      <form action={formAction} className="flex flex-col gap-2">
        <input
          name="nickname"
          maxLength={40}
          placeholder="Nimimerkki (valinnainen)"
          className="rounded border border-line bg-paper p-2 text-sm sm:max-w-xs"
        />
        <textarea
          name="body"
          required
          maxLength={EXPERIENCE_MAX_LENGTH}
          rows={4}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Mitä ajatuksia kirjoitus herätti?"
          className="rounded border border-line bg-paper p-3 text-sm"
        />
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.ok && !state.error && <p className="text-sm text-accent-2">Kiitos! Kommenttisi on julkaistu.</p>}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">
            {value.length} / {EXPERIENCE_MAX_LENGTH}
          </span>
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-accent px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Lähetetään…" : "Kommentoi"}
          </button>
        </div>
      </form>
    </div>
  );
}
