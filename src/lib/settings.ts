import { prisma } from "@/lib/db";
import type { SiteSettings } from "@prisma/client";

export async function getSiteSettings(): Promise<SiteSettings> {
  return prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}
