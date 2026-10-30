import "server-only";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getRequestIp } from "@/lib/request-ip";
import { isIpBanned } from "@/lib/bans";
import { cleanExperienceBody, type ExperienceFormState } from "@/lib/experience-format";

export const NICKNAME_MAX_LENGTH = 40;

/**
 * Anonymous like Kokemukset, with the same text rules, the same IP ban list
 * and moderation at /admin/kommentit. The nickname is optional and proves
 * nothing: anyone can type any name.
 */
export async function postArticleComment(
  articleId: string,
  rawNickname: string,
  rawBody: string,
): Promise<ExperienceFormState> {
  const ip = await getRequestIp();
  if (await isIpBanned(ip)) {
    return { error: "Tämä IP-osoite on tilapäisesti estetty kommentoimasta." };
  }

  const article = await prisma.article.findUnique({ where: { id: articleId }, select: { status: true } });
  if (!article || article.status !== "PUBLISHED") return { error: "Artikkelia ei löytynyt." };

  const body = cleanExperienceBody(rawBody);
  if (!body) return { error: "Kirjoita ensin kommenttisi." };
  const nickname = rawNickname.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, NICKNAME_MAX_LENGTH) || null;

  await prisma.articleComment.create({ data: { articleId, nickname, body, ipAddress: ip } });

  revalidatePath(`/artikkelit/${articleId}`);
  revalidatePath("/artikkelit");
  return { ok: true };
}
