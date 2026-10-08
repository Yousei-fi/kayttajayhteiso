"use server";

import { postExperience } from "@/lib/experiences";
import type { ExperienceFormState } from "@/lib/experience-format";

/** The board's form, where the poster picks the service themselves. */
export async function addBoardExperience(
  areaId: string,
  _prev: ExperienceFormState,
  formData: FormData,
): Promise<ExperienceFormState> {
  return postExperience(areaId, String(formData.get("serviceId") ?? ""), String(formData.get("body") ?? ""));
}
