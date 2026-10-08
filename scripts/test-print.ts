/**
 * Renders an area's upcoming paper to a print PDF, with the same template and
 * Puppeteer settings as "Luo PDF" in /admin/lehti, without finalizing
 * anything. For proofing an area's layout before it launches — above all its
 * NA listing and services phonebook, which vary most in length.
 *
 *   npm run test-print -- --area paakaupunkiseutu
 *
 * The draft edition is found or created exactly as opening the dashboard
 * would. Prints the PDF's path (under the uploads dir, zines/<area>/).
 * Needs the react-server condition, which the npm script passes, because the
 * library code it reuses is server-only.
 */
import { prisma } from "../src/lib/db";
import { getSyncedUpcomingEdition, getZineDirectorySections } from "../src/lib/zine";
import { buildZineHtml } from "../src/lib/zine-html";
import { renderZinePdf } from "../src/lib/pdf";
import { getSiteSettings } from "../src/lib/settings";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const areaId = argv[argv.indexOf("--area") + 1];
  const area = argv.includes("--area") && areaId ? await prisma.area.findUnique({ where: { id: areaId } }) : null;
  if (!area) {
    const areas = await prisma.area.findMany({ select: { id: true } });
    throw new Error(`Anna --area <alue>. Alueet: ${areas.map((a) => a.id).join(", ")}`);
  }

  const draft = await getSyncedUpcomingEdition(area);
  const [edition, settings] = await Promise.all([
    prisma.zineEdition.findUniqueOrThrow({
      where: { id: draft.id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    getSiteSettings(),
  ]);
  const { services, meetings } = await getZineDirectorySections(edition);

  const html = await buildZineHtml({
    edition,
    settings,
    area,
    services,
    meetings,
    mode: "print",
    assetBaseUrl: process.env.APP_URL ?? "http://localhost:3000",
  });
  const filename = `koevedos-${area.id}-${edition.startDate.toISOString().slice(0, 10)}.pdf`;
  const pdfPath = await renderZinePdf(html, area.id, filename);

  console.log(`${area.name}: ${services.length} palvelua, ${meetings.length} NA-kokousta -> ${pdfPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
