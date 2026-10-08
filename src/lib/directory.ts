/**
 * The order the service directory's categories are read in, on the site and
 * in the paper. The database sorts them alphabetically, which puts
 * "Aikuisten psykiatria" ahead of "Kiireellinen apu ja kriisipalvelut" — the
 * wrong way round for a paper someone may be holding in an emergency. This
 * is the order prisma/data/services-source.txt is written in: urgent help
 * first, then treatment, then everything one browses at leisure.
 *
 * New areas use the neutral names (the page already says which area it is);
 * Tampere's list still carries its place-named headings.
 *
 * A category not listed here sorts after these, alphabetically, so adding
 * one to the source file never drops it — it just lands at the end until
 * someone decides where it belongs.
 */
const CATEGORY_ORDER = [
  "KIIREELLINEN APU JA KRIISIPALVELUT",
  "MATALAN KYNNYKSEN PALVELUT JA TERVEYSNEUVONTA",
  "PÄIHDEHOITO, HUUMEHOITO JA RIIPPUVUUSPALVELUT",
  "AIKUISTEN PSYKIATRIA",
  "LASTENPSYKIATRIA",
  "NUORISOPSYKIATRIA",
  "MIELENTERVEYS- JA PÄIHDEJÄRJESTÖT",
  "TAMPEREELLA TOIMIVAT MIELENTERVEYS- JA PÄIHDEJÄRJESTÖT",
  "VERTAISTUKIRYHMÄT",
  "VERTAISTUKIRYHMÄT TAMPEREELLA",
  "VERTAISTUKIRYHMÄT TAMPEREEN SEUDULLA",
  "PUHELIN- JA VERKKOPALVELUT",
];

export function categoryRank(category: string): number {
  const index = CATEGORY_ORDER.indexOf(category);
  return index === -1 ? CATEGORY_ORDER.length : index;
}

/** Sorts categories into reading order, unknown ones alphabetically at the end. */
export function compareCategories(a: string, b: string): number {
  return categoryRank(a) - categoryRank(b) || a.localeCompare(b, "fi");
}
