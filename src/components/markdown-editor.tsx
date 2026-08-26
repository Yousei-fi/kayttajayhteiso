"use client";

import { useState } from "react";
import { renderMarkdown } from "@/lib/markdown";

export function MarkdownEditor({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Teksti (Markdown: **lihavointi**, # otsikko, ![kuvateksti](kuva-url))</span>
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="text-xs text-accent-2 underline"
        >
          {showPreview ? "Muokkaa" : "Esikatsele"}
        </button>
      </div>

      {showPreview && (
        <div
          className="prose-content min-h-40 rounded border border-line bg-white p-3"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
        />
      )}
      <textarea
        name={name}
        required
        rows={14}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        hidden={showPreview}
        className="rounded border border-line bg-paper p-3 font-mono text-sm"
      />
    </div>
  );
}
