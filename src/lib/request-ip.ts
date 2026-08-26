import "server-only";
import { headers } from "next/headers";

/**
 * Best-effort client IP from proxy headers (Coolify/Traefik set
 * x-forwarded-for; falls back to x-real-ip). Returns null if neither is
 * present, e.g. a direct connection in local dev with no proxy in front.
 */
export async function getRequestIp(): Promise<string | null> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return h.get("x-real-ip");
}
