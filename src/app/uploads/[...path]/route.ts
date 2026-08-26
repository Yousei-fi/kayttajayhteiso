import { readFile, stat } from "fs/promises";
import path from "path";
import { STORAGE_DIR } from "@/lib/storage";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

/**
 * Serves uploaded images and generated zine PDFs from disk on every
 * request. These files are written after the server has started, and
 * Next.js's production server only serves what was present in /public at
 * boot, so they cannot go through the normal static file pipeline.
 */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/uploads/[...path]">,
): Promise<Response> {
  const { path: segments } = await ctx.params;

  if (segments.some((s) => s === "." || s === ".." || s.includes("/") || s.includes("\\"))) {
    return new Response("Not found", { status: 404 });
  }

  const ext = path.extname(segments[segments.length - 1] ?? "").toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = path.join(STORAGE_DIR, ...segments);
  if (!filePath.startsWith(path.join(STORAGE_DIR, path.sep))) {
    return new Response("Not found", { status: 404 });
  }

  try {
    await stat(filePath);
    const data = await readFile(filePath);
    const cacheControl = segments[0] === "zines" ? "no-cache" : "public, max-age=31536000, immutable";
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": contentType, "Cache-Control": cacheControl },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
