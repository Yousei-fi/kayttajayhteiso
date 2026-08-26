import path from "path";

/**
 * Deliberately outside of /public: Next.js's production server snapshots
 * the public folder's contents at boot, so files written there afterwards
 * (uploaded images, generated zine PDFs) would 404 until the process
 * restarts. Files here are served instead through the /uploads route
 * handler (src/app/uploads/[...path]/route.ts), which reads from disk on
 * every request.
 */
export const STORAGE_DIR = process.env.UPLOADS_DIR ?? path.join(process.cwd(), "storage", "uploads");
