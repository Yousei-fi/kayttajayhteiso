import "server-only";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { STORAGE_DIR } from "@/lib/storage";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_SIZE = 8 * 1024 * 1024;

/** Saves an uploaded image to the uploads storage dir and returns its public (/uploads/...) path, or null if no file was provided. */
export async function saveImageUpload(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_SIZE) {
    throw new Error("Kuva on liian suuri (max 8 Mt).");
  }
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new Error("Tuntematon kuvatiedoston tyyppi.");
  }

  const dir = path.join(STORAGE_DIR, "images");
  await mkdir(dir, { recursive: true });

  const filename = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/images/${filename}`;
}
