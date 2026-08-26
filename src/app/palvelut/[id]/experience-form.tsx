"use client";

import { useState } from "react";

const MAX_LENGTH = 300;

export function ExperienceForm({ action }: { action: (formData: FormData) => void }) {
  const [value, setValue] = useState("");

  return (
    <form
      action={action}
      onSubmit={() => setValue("")}
      className="flex flex-col gap-2"
    >
      <textarea
        name="body"
        required
        maxLength={MAX_LENGTH}
        rows={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Millainen kokemus sinulla on tästä palvelusta?"
        className="rounded border border-line bg-paper p-3 text-sm"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">
          {value.length} / {MAX_LENGTH}
        </span>
        <button type="submit" className="rounded bg-accent px-4 py-1.5 text-sm font-semibold text-white">
          Lähetä
        </button>
      </div>
    </form>
  );
}
