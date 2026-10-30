"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/** Articles are national, so any admin can remove an abusive comment straight away. */
export async function deleteArticleComment(commentId: string): Promise<void> {
  await requireUser("ADMIN");
  const comment = await prisma.articleComment.delete({ where: { id: commentId } });
  revalidatePath("/admin/kommentit");
  revalidatePath(`/artikkelit/${comment.articleId}`);
}
