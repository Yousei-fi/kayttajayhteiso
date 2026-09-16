/**
 * The printed paper's own identity, kept apart from the organisation's
 * (Tampereen Käyttäjäyhteisö publishes it, but the paper is its own thing).
 *
 * The name and the mark both come from Carl Sagan's "science is a candle in
 * the dark": a small light someone lights on purpose, not a floodlight.
 */
export const ZINE_NAME = "Kynttilä pimeydessä";

/** Printed under the mark on the cover, and used as the paper's strapline online. */
export const ZINE_TAGLINE = "Tampereen Käyttäjäyhteisön lehti";

/**
 * The candle mark, as the inner content of an SVG with viewBox "0 0 48 76".
 *
 * Drawn as strokes in `currentColor` with only one small filled shape (the
 * flame's core), because this gets photocopied and printed on whatever
 * machine is to hand: line art costs almost no toner, while a solid mark of
 * the same size would drink it. Anything added here should keep that
 * bargain — outlines and hairlines, not fills.
 */
export const CANDLE_MARK_INNER = `
  <g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M24 10 C28 18 33 22 33 29 A9 9 0 0 1 15 29 C15 22 20 18 24 10 Z" />
    <path d="M24 38 v6" />
    <path d="M15 46.5 C19 43.5 21.5 46.5 24 45 C26.5 46.5 29 43.5 33 46.5 L33 72 L15 72 Z" />
    <path d="M24 1 v5" opacity="0.65" />
    <path d="M8 11 l4 4" opacity="0.65" />
    <path d="M40 11 l-4 4" opacity="0.65" />
    <path d="M2 30 h5" opacity="0.65" />
    <path d="M46 30 h-5" opacity="0.65" />
  </g>
  <path d="M24 21 C26 25 28 27 28 29.5 A4 4 0 0 1 20 29.5 C20 27 22 25 24 21 Z" fill="currentColor" />
`;

/**
 * Just the flame, on viewBox "0 0 24 26". The full mark turns to mush below
 * about 14mm, so small uses (section markers, run-in ornaments) take this
 * instead of shrinking the candle.
 */
export const FLAME_MARK_INNER = `
  <path d="M12 2 C15 7 19 10 19 15 A7 7 0 0 1 5 15 C5 10 9 7 12 2 Z"
    fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" />
  <path d="M12 10 C13.6 12.6 15 14 15 15.6 A3 3 0 0 1 9 15.6 C9 14 10.4 12.6 12 10 Z" fill="currentColor" />
`;

/**
 * The marks as standalone SVG strings, for the zine HTML (which is assembled
 * as text rather than as React).
 */
export function candleMarkSvg(className = "candle-mark"): string {
  return `<svg class="${className}" viewBox="0 0 48 76" role="img" aria-label="${ZINE_NAME}" xmlns="http://www.w3.org/2000/svg">${CANDLE_MARK_INNER}</svg>`;
}

export function flameMarkSvg(className = "flame-mark"): string {
  return `<svg class="${className}" viewBox="0 0 24 26" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${FLAME_MARK_INNER}</svg>`;
}
