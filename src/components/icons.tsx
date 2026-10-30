import { CANDLE_MARK_INNER, ZINE_NAME } from "@/lib/zine-brand";

export function MailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m3 6 9 6 9-6" />
    </svg>
  );
}

/**
 * The paper's candle mark, sharing its path data with the printed zine (see
 * src/lib/zine-brand.ts) so the two can never drift. The markup is a static
 * constant of ours, never user input.
 */
export function CandleMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 76"
      className={className}
      role="img"
      aria-label={ZINE_NAME}
      dangerouslySetInnerHTML={{ __html: CANDLE_MARK_INNER }}
    />
  );
}
