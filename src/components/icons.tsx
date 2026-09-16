import { CANDLE_MARK_INNER, ZINE_NAME } from "@/lib/zine-brand";

export function MailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m3 6 9 6 9-6" />
    </svg>
  );
}

export function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M21.05 3.5 2.7 10.98c-1.25.52-1.24 1.24-.23 1.55l4.7 1.47 10.9-6.87c.51-.32.98-.15.6.2l-8.83 7.98h-.01l.01.01-.33 4.65c.48 0 .69-.22.95-.48l2.28-2.2 4.74 3.5c.87.48 1.5.24 1.72-.81l3.11-14.66c.32-1.28-.49-1.86-1.36-1.82Z" />
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
