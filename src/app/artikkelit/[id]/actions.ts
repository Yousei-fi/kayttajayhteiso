"use server";

import { postArticleComment } from "@/lib/article-comments";
import type { ExperienceFormState } from "@/lib/experience-format";

export async function addArticleComment(
  articleId: string,
  _prev: ExperienceFormState,
  formData: FormData,
): Promise<ExperienceFormState> {
  return postArticleComment(articleId, String(formData.get("nickname") ?? ""), String(formData.get("body") ?? ""));
}
