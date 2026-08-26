import "server-only";
import { prisma } from "@/lib/db";

export async function isIpBanned(ip: string | null): Promise<boolean> {
  if (!ip) return false;
  const ban = await prisma.bannedIp.findUnique({ where: { ipAddress: ip } });
  return !!ban && ban.bannedUntil > new Date();
}
