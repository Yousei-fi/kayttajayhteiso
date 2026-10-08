import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Models that belong to one area. Article is deliberately not here: articles
 * are national. Experience takes its area from its service.
 */
const AREA_MODELS = new Set([
  "Alert",
  "CommunityEvent",
  "StreetRound",
  "ZineEdition",
  "DirectoryService",
  "NaMeeting",
]);

function scopeToArea(areaId: string) {
  return prisma.$extends({
    name: "area-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!AREA_MODELS.has(model)) return query(args);

          // Prisma's args type is a union over every operation; each branch
          // below only touches the field that operation actually has.
          const a = (args ?? {}) as Record<string, unknown>;
          switch (operation) {
            case "create":
              a.data = { ...(a.data as object), areaId };
              break;
            case "createMany":
            case "createManyAndReturn":
              a.data = ([] as object[]).concat(a.data as object).map((d) => ({ ...d, areaId }));
              break;
            case "upsert":
              a.where = { ...(a.where as object), areaId };
              a.create = { ...(a.create as object), areaId };
              break;
            default:
              // Every read, update, delete, count and aggregate takes a where.
              a.where = { ...(a.where as object), areaId };
          }
          return query(a as typeof args);
        },
      },
    },
  });
}

export type AreaDb = ReturnType<typeof scopeToArea>;

const areaClients = new Map<string, AreaDb>();

/**
 * A client that only sees one area's rows: every query on an area model gets
 * `areaId` added to its where, and every create gets it added to its data.
 * Pages and actions for an area use this instead of `prisma`, so a missed
 * filter can't show Tampere's internal street-round notes to a Turku account.
 *
 * Writes are scoped too: an update or delete on another area's row finds
 * nothing (findUniqueOrThrow throws, update throws P2025) rather than
 * changing it.
 *
 * Relations reached through include/select are not filtered. That is fine
 * for the shapes this app uses (an Alert's service account, a service's
 * Kokemukset), which already belong to the row's own area.
 */
export function areaDb(areaId: string): AreaDb {
  let client = areaClients.get(areaId);
  if (!client) {
    client = scopeToArea(areaId);
    areaClients.set(areaId, client);
  }
  return client;
}
