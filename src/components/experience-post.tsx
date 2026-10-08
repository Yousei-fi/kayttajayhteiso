import Link from "next/link";
import { formatDateTime } from "@/lib/week";

/** One experience as a bulletin-board post. */
export function ExperiencePost({
  body,
  createdAt,
  service,
  serviceHref,
  boardHref,
  areaName,
}: {
  body: string;
  createdAt: Date;
  service?: { name: string; category: string } | null;
  serviceHref?: string;
  /** The board filtered to this post's service. */
  boardHref?: string;
  areaName?: string;
}) {
  return (
    <article className="rounded border border-line border-l-4 border-l-accent-2 bg-paper p-3">
      {service && (
        <header className="mb-1 flex flex-wrap items-baseline gap-x-2">
          {boardHref ? (
            <Link href={boardHref} className="font-semibold hover:underline">
              {service.name}
            </Link>
          ) : (
            <span className="font-semibold">{service.name}</span>
          )}
          <span className="text-xs uppercase tracking-wide text-muted">
            {areaName ? `${areaName} · ` : ""}
            {service.category}
          </span>
        </header>
      )}
      <p className="whitespace-pre-line text-sm leading-relaxed">{body}</p>
      <footer className="mt-2 flex flex-wrap gap-x-3 text-xs text-muted">
        <time dateTime={createdAt.toISOString()}>{formatDateTime(createdAt)}</time>
        {serviceHref && (
          <Link href={serviceHref} className="text-accent-2 hover:underline">
            Palvelun tiedot
          </Link>
        )}
      </footer>
    </article>
  );
}
