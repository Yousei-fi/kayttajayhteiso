"use server";

import { prisma } from "@/lib/db";
import { requireUser, requireAreaUser } from "@/lib/auth";
import { saveImageUpload } from "@/lib/uploads";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function assertCanEdit(articleId: string) {
  const user = await requireUser("MEMBER", "ADMIN");
  const article = await prisma.article.findUniqueOrThrow({ where: { id: articleId } });
  if (user.role !== "ADMIN" && article.authorId !== user.id) {
    throw new Error("Ei oikeutta muokata tätä artikkelia.");
  }
  return { user, article };
}

export async function createArticle(formData: FormData): Promise<void> {
  const user = await requireUser("MEMBER", "ADMIN");

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const status = formData.get("status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  const includeInZine = formData.get("includeInZine") === "on";
  const image = formData.get("image") as File | null;

  if (!title || !body) {
    throw new Error("Otsikko ja teksti vaaditaan.");
  }

  const imagePath = await saveImageUpload(image);

  const article = await prisma.article.create({
    data: { authorId: user.id, title, body, status, includeInZine, imagePath },
  });

  revalidatePath("/dashboard/artikkelit");
  revalidatePath("/artikkelit");
  redirect(`/dashboard/artikkelit/${article.id}`);
}

export async function updateArticle(articleId: string, formData: FormData): Promise<void> {
  const { article } = await assertCanEdit(articleId);

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const status = formData.get("status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  const includeInZine = formData.get("includeInZine") === "on";
  const image = formData.get("image") as File | null;

  if (!title || !body) {
    throw new Error("Otsikko ja teksti vaaditaan.");
  }

  const newImagePath = await saveImageUpload(image);

  await prisma.article.update({
    where: { id: article.id },
    data: {
      title,
      body,
      status,
      includeInZine,
      ...(newImagePath ? { imagePath: newImagePath } : {}),
    },
  });

  revalidatePath("/dashboard/artikkelit");
  revalidatePath(`/dashboard/artikkelit/${article.id}`);
  revalidatePath("/artikkelit");
}

export async function deleteArticle(articleId: string): Promise<void> {
  const { article } = await assertCanEdit(articleId);
  await prisma.article.delete({ where: { id: article.id } });
  revalidatePath("/dashboard/artikkelit");
  redirect("/dashboard/artikkelit");
}

export async function duplicateAsDraftFromRound(roundId: string): Promise<void> {
  const { user, db } = await requireAreaUser("MEMBER", "ADMIN");
  const round = await db.streetRound.findUniqueOrThrow({ where: { id: roundId } });

  const article = await prisma.article.create({
    data: {
      authorId: user.id,
      title: `Havainto katukierrokselta ${round.place ?? ""}`.trim(),
      body: round.notes,
      status: "DRAFT",
      includeInZine: false,
    },
  });

  redirect(`/dashboard/artikkelit/${article.id}`);
}
