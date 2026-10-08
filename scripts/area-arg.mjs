/**
 * `--area <slug>` for the data scripts: which area's files under
 * prisma/data/<area>/ to read and write. Defaults to tampere, the only area
 * with data so far.
 */
import path from "path";
import { fileURLToPath } from "url";

const argv = process.argv.slice(2);
const flag = argv.indexOf("--area");
export const AREA = flag !== -1 && argv[flag + 1] ? argv[flag + 1] : "tampere";

if (!/^[a-z-]+$/.test(AREA)) {
  console.error(`Virheellinen alue: ${AREA}`);
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** prisma/data/<area>/<name> */
export function areaDataFile(name) {
  return path.join(__dirname, "../prisma/data", AREA, name);
}
