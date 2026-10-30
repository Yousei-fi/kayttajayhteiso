import { ARTICLE_RUNS, DEFAULT_ARTICLE_RUN, EVENT_RUNS, firstOpenEditionStart } from "@/lib/zine-run";
import { formatDate } from "@/lib/week";

const issuesLabel = (n: number) => (n === 1 ? "1 numero" : `${n} numeroa`);

/**
 * "Lehdessä": whether an article or event goes in the weekly paper, and for
 * how many issues. On an existing one the first option keeps what it has.
 */
export function ZineRunSelect({
  kind,
  current,
  disabled,
}: {
  kind: "article" | "event";
  current?: { includeInZine: boolean; zineUntil: Date | null };
  disabled?: boolean;
}) {
  const first = firstOpenEditionStart();
  const runs = kind === "article" ? ARTICLE_RUNS : EVENT_RUNS;
  const defaultValue = current ? "keep" : kind === "article" ? String(DEFAULT_ARTICLE_RUN) : "untilEvent";

  let keepLabel = "";
  if (current) {
    if (!current.includeInZine) keepLabel = "Ennallaan: ei lehteen";
    else if (!current.zineUntil) keepLabel = "Ennallaan: kunnes tapahtuma on ohi";
    else if (current.zineUntil < first) keepLabel = `Ennallaan: oli lehdessä ${formatDate(current.zineUntil)} alkavaan viikkoon asti`;
    else keepLabel = `Ennallaan: lehdessä ${formatDate(current.zineUntil)} alkavaan viikkoon asti`;
  }

  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      Lehdessä
      <select
        name="zineRun"
        defaultValue={defaultValue}
        disabled={disabled}
        className="rounded border border-line bg-paper px-3 py-2 disabled:opacity-60"
      >
        {current && <option value="keep">{keepLabel}</option>}
        {kind === "event" && <option value="untilEvent">Kunnes tapahtuma on ohi</option>}
        {runs.map((n) => (
          <option key={n} value={n}>
            {issuesLabel(n)}
            {n === DEFAULT_ARTICLE_RUN && kind === "article" ? " (noin kuukausi)" : ""}
          </option>
        ))}
        <option value="none">Ei lehteen</option>
      </select>
      <span className="text-xs font-normal text-muted">
        Lehti ilmestyy kerran viikossa. Ensimmäinen numero, johon tämä vielä ehtii, on {formatDate(first)} alkava
        viikko.
      </span>
    </label>
  );
}
