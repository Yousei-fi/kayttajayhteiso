/** Long enough for a proper account of a visit, short enough to read in a feed. */
export const EXPERIENCE_MAX_LENGTH = 1000;

export type ExperienceFormState = { error?: string; ok?: boolean };

/** Plain text only; keeps paragraph breaks but no more than one blank line. */
export function cleanExperienceBody(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, EXPERIENCE_MAX_LENGTH);
}
