"use client";

import { useActionState, useState } from "react";

const MAX_LENGTH = 300;

export type ExperienceFormState = { error?: string };

export function ExperienceForm({
  action,
}: {
  action: (prev: ExperienceFormState, formData: FormData) => Promise<ExperienceFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [value, setValue] = useState("");

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded border border-danger bg-red-50 px-3 py-2 text-sm font-medium text-danger">
        HUOM! Älä jaa yksityisiä tietoja tai vihapuhetta. IP-osoitteesi tallennetaan.
      </p>

      <form action={formAction} onSubmit={() => setValue("")} className="flex flex-col gap-2">
        <textarea
          name="body"
          required
          maxLength={MAX_LENGTH}
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Millainen kokemus sinulla on?"
          className="rounded border border-line bg-paper p-3 text-sm"
        />
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">
            {value.length} / {MAX_LENGTH}
          </span>
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-accent px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Lähetetään…" : "Lähetä"}
          </button>
        </div>
      </form>
    </div>
  );
}
