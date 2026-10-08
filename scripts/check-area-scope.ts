/**
 * Checks that areaDb() keeps each area to its own rows: reads, counts,
 * updates and deletes through one area's client never see or touch another
 * area's rows, and creates are tagged with the client's area.
 *
 *   npm run check:area-scope
 *
 * Runs against DATABASE_URL. It writes a few street rounds under a throwaway
 * author and removes them again, so it is safe on a dev database; don't
 * point it at production.
 */
import assert from "node:assert/strict";
import { prisma, areaDb } from "../src/lib/db";

const MARK = `area-scope-check-${Date.now()}`;

async function main(): Promise<void> {
  const author = await prisma.user.create({
    data: { name: MARK, email: `${MARK}@example.invalid`, passwordHash: "-", role: "MEMBER", areaId: "tampere" },
  });

  try {
    const tampere = areaDb("tampere");
    const turku = areaDb("turku");

    const own = await tampere.streetRound.create({
      data: { authorId: author.id, date: new Date(), notes: MARK } as never,
    });
    assert.equal(own.areaId, "tampere", "create is tagged with the client's area");

    const other = await turku.streetRound.create({
      data: { authorId: author.id, date: new Date(), notes: MARK } as never,
    });
    assert.equal(other.areaId, "turku");

    const seenByTampere = await tampere.streetRound.findMany({ where: { notes: MARK } });
    assert.deepEqual(seenByTampere.map((r) => r.id), [own.id], "findMany sees only its own area");
    assert.equal(await tampere.streetRound.count({ where: { notes: MARK } }), 1, "count is scoped");

    assert.equal(await tampere.streetRound.findUnique({ where: { id: other.id } }), null, "findUnique by id is scoped");
    await assert.rejects(
      tampere.streetRound.update({ where: { id: other.id }, data: { notes: "changed" } }),
      "update of another area's row fails",
    );
    await assert.rejects(tampere.streetRound.delete({ where: { id: other.id } }), "delete of another area's row fails");

    const bulk = await tampere.streetRound.updateMany({ where: { notes: MARK }, data: { participants: "x" } });
    assert.equal(bulk.count, 1, "updateMany only touches its own area");
    const untouched = await prisma.streetRound.findUniqueOrThrow({ where: { id: other.id } });
    assert.equal(untouched.participants, null);

    const turkuServices = await turku.directoryService.findMany({ select: { areaId: true } });
    assert.ok(turkuServices.every((s) => s.areaId === "turku"), "Turku sees only its own services");
    assert.equal(
      turkuServices.length,
      await prisma.directoryService.count({ where: { areaId: "turku" } }),
      "Turku sees all of its own services",
    );

    console.log("Area scoping: all checks passed.");
  } finally {
    await prisma.streetRound.deleteMany({ where: { notes: MARK } });
    await prisma.user.delete({ where: { id: author.id } });
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
