/**
 * Creates a SERVICE login for every organisation in the service directory
 * and renders a printable A4 sheet of cut-out slips, one per organisation,
 * to hand over on paper.
 *
 *   node scripts/seed-service-accounts.mjs                 # create what's missing, print those
 *   node scripts/seed-service-accounts.mjs --dry-run       # show what it would do, touch nothing
 *   node scripts/seed-service-accounts.mjs --reset-all     # new password for every service account
 *   node scripts/seed-service-accounts.mjs --out kansio/tunnukset.pdf
 *
 * A password is only ever visible in the run that generates it — the
 * database keeps a bcrypt hash and nothing else — so the PDF covers exactly
 * the accounts this run issued a password for. An account that already
 * exists is left alone unless --reset-all is given, which invalidates any
 * slip already handed out for it.
 *
 * The PDF contains live credentials in plain text. It is written outside
 * storage/ on purpose: everything under storage/ is served unauthenticated
 * at /uploads/<path>, so a credentials file placed there would be public.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import puppeteer from "puppeteer";
import QRCode from "qrcode";
import { randomInt } from "crypto";
import { writeFile, chmod, mkdir } from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

const DEFAULTS = {
  out: "palvelutunnukset.pdf",
  emailDomain: "palvelut.kayttajayhteiso.fi",
  fallbackSiteUrl: "https://tampere.kayttajayhteiso.fi",
  contactEmail: "tampere@kayttajayhteiso.fi",
};

// Lowercase and unambiguous: no i/l/1 or o/0, so a password read off paper
// cannot be mistyped from the glyphs alone, and no shift key is needed.
const PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const PASSWORD_GROUPS = 3;
const PASSWORD_GROUP_LEN = 4;

const SLIPS_PER_PAGE = 8; // 2 columns x 4 rows on A4
const SLUG_MAX = 26;
// Names that collide at the short cap are re-slugged at this one, so the
// distinguishing words survive instead of becoming a numeric suffix.
// Chosen so the longest identifier still fits one printed line: this plus
// the "@palvelut.kayttajayhteiso.fi" domain stays inside the slip width.
const SLUG_MAX_LONG = 30;

function parseArgs() {
  const argv = process.argv.slice(2);
  const args = { flags: new Set(), values: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    if (["out", "email-domain", "url"].includes(key)) {
      args.values[key] = argv[++i];
    } else {
      args.flags.add(key);
    }
  }
  return args;
}

/** A printable password with roughly 59 bits of entropy. */
function generatePassword() {
  const groups = [];
  for (let g = 0; g < PASSWORD_GROUPS; g++) {
    let group = "";
    for (let i = 0; i < PASSWORD_GROUP_LEN; i++) {
      group += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
    }
    groups.push(group);
  }
  return groups.join("-");
}

/**
 * Organisation name -> the local part of its login identifier.
 *
 * Capped at SLUG_MAX and always cut at a word boundary: someone types this
 * off a paper slip, and an identifier ending mid-word reads as a typo.
 */
function slugify(name, cap = SLUG_MAX) {
  const full = name
    .toLowerCase()
    .replaceAll("ä", "a")
    .replaceAll("ö", "o")
    .replaceAll("å", "a")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (full.length <= cap) return full;

  const cut = full.slice(0, cap);
  if (full[cap] === "-") return cut; // the cut already lands on a word end

  const lastDash = cut.lastIndexOf("-");
  // Fall back to the hard cut only if the first word alone exceeds the cap,
  // which would otherwise leave an empty slug.
  return (lastDash > 0 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, "");
}

function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function buildHtml(slips, { loginUrlLabel, contactEmail, qrSvg }) {
  const pages = chunk(slips, SLIPS_PER_PAGE)
    .map(
      (page) => `
      <section class="page">
        ${page
          .map(
            (s) => `
          <article class="slip">
            <header>
              <p class="kicker">
                <span class="brand">Tampereen Käyttäjäyhteisö</span>
                <span class="cat">${esc(s.category)}</span>
              </p>
              <h2>${esc(s.orgName)}</h2>
              <p class="purpose">Palvelutili: ilmoitukset lehteen ja sivustolle.</p>
            </header>

            <div class="creds">
              <p class="row"><span class="lab">Kirjautuminen</span><span class="val">${esc(loginUrlLabel)}</span></p>
              <p class="row"><span class="lab">Tunnus</span><span class="val id${s.email.length > 50 ? " long" : ""}">${esc(s.email)}</span></p>
              <p class="row"><span class="lab">Salasana</span><span class="val pw">${esc(s.password)}</span></p>
            </div>

            <footer>
              <div class="qr">${qrSvg}</div>
              <p class="note">
                Tunnus ei ole sähköpostiosoite eikä siihen lähetetä postia.
                Säilytä tämä lappu: salasanaa ei voi katsoa jälkikäteen,
                uuden saa osoitteesta ${esc(contactEmail)}.
              </p>
            </footer>
          </article>`,
          )
          .join("")}
        ${Array.from({ length: SLIPS_PER_PAGE - page.length }, () => '<article class="slip empty"></article>').join("")}
      </section>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fi">
<head>
<meta charset="utf-8">
<title>Palvelutunnukset</title>
<style>
  @page { size: A4; margin: 8mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "DejaVu Sans", Arial, Helvetica, sans-serif;
    color: #1e1b29;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: repeat(4, 1fr);
    width: 194mm;
    height: 281mm;
    page-break-after: always;
  }
  .page:last-child { page-break-after: auto; }
  .slip {
    border: 1px dashed #9a9098;
    padding: 4.5mm 5mm;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .slip.empty { border-color: #d9d4d8; }
  .kicker {
    margin: 0 0 1mm;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 2mm;
    font-size: 6pt;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #6b5f57;
  }
  /* Both halves stay on one line; the category is what lets a pile of 128
     slips be sorted by hand, so it is kept and truncated rather than wrapped. */
  .kicker span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .kicker .brand { flex: 0 0 auto; }
  .kicker .cat { flex: 0 1 auto; min-width: 0; text-align: right; color: #8d8189; }
  h2 {
    margin: 0;
    font-size: 10.5pt;
    line-height: 1.15;
    /* Long organisation names are clamped rather than allowed to push the
       credentials off the slip. */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .purpose { margin: 1.2mm 0 0; font-size: 7pt; color: #4a4450; }
  .creds { margin: 3mm 0 0; }
  .row { margin: 0 0 1.8mm; }
  .lab {
    display: block;
    font-size: 5.8pt;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #6b5f57;
  }
  /* Each value gets the full slip width, so an identifier never has to break
     across lines in the middle of the domain. */
  .val {
    display: block;
    font-family: "DejaVu Sans Mono", "Courier New", monospace;
    font-size: 7.6pt;
    line-height: 1.25;
    word-break: break-all;
  }
  .val.id { font-size: 6.9pt; }
  /* Keeps the longest identifiers on a single line rather than breaking
     them across the middle of the domain. */
  .val.id.long { font-size: 6.1pt; }
  .val.pw { font-size: 11pt; font-weight: 700; letter-spacing: 0.04em; }
  footer { margin-top: auto; padding-top: 2.5mm; display: flex; gap: 2.5mm; align-items: center; }
  .qr { flex: 0 0 13mm; }
  .qr svg { width: 13mm; height: 13mm; display: block; }
  .note { margin: 0; font-size: 6pt; line-height: 1.35; color: #6b5f57; }
</style>
</head>
<body>${pages}</body>
</html>`;
}

async function renderPdf(html, outPath) {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "8mm", bottom: "8mm", left: "8mm", right: "8mm" },
    });
    const dir = path.dirname(path.resolve(outPath));
    await mkdir(dir, { recursive: true });
    await writeFile(outPath, pdf);
    // Credentials in plain text: keep it off other accounts on the machine.
    await chmod(outPath, 0o600).catch(() => {});
  } finally {
    await browser.close();
  }
}

async function main() {
  const args = parseArgs();
  const dryRun = args.flags.has("dry-run");
  const resetAll = args.flags.has("reset-all");
  const outPath = args.values.out ?? DEFAULTS.out;
  const emailDomain = (args.values["email-domain"] ?? DEFAULTS.emailDomain).toLowerCase();

  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  const siteUrl = (args.values.url ?? settings?.publicSiteUrl ?? DEFAULTS.fallbackSiteUrl).replace(/\/+$/, "");
  const loginUrl = `${siteUrl}/kirjaudu`;
  const loginUrlLabel = loginUrl.replace(/^https?:\/\//, "");
  const contactEmail = settings?.submissionEmail || DEFAULTS.contactEmail;

  // One login per organisation, not per directory listing: a few
  // organisations appear under two categories.
  const rows = await prisma.directoryService.findMany({
    select: { name: true, category: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const seenName = new Set();
  const uniqueRows = [];
  for (const row of rows) {
    const name = row.name.trim();
    if (!name || seenName.has(name)) continue;
    seenName.add(name);
    uniqueRows.push({ ...row, name });
  }

  // Several organisations share a long common prefix ("Setlementti Tampere -
  // ..."), which the short cap would reduce to the same slug and then tell
  // apart only by a meaningless number. Anything that collides at the short
  // cap is re-slugged at the long one instead, so the identifier still names
  // the organisation it belongs to.
  const shortCount = new Map();
  for (const row of uniqueRows) {
    const short = slugify(row.name);
    if (short) shortCount.set(short, (shortCount.get(short) ?? 0) + 1);
  }

  const orgs = [];
  const usedSlug = new Set();

  for (const row of uniqueRows) {
    const short = slugify(row.name);
    if (!short) continue;

    let slug = shortCount.get(short) > 1 ? slugify(row.name, SLUG_MAX_LONG) : short;

    // A numeric suffix remains the last resort for names that are still
    // identical once slugged (different punctuation, same words).
    if (usedSlug.has(slug)) {
      let n = 2;
      while (usedSlug.has(`${slug}-${n}`)) n++;
      slug = `${slug}-${n}`;
    }
    usedSlug.add(slug);

    orgs.push({ orgName: row.name, category: row.category, email: `${slug}@${emailDomain}` });
  }

  const slips = [];
  let created = 0;
  let reset = 0;
  let skipped = 0;

  for (const org of orgs) {
    const existing = await prisma.user.findUnique({ where: { email: org.email } });

    if (existing && !resetAll) {
      skipped++;
      continue;
    }

    const password = generatePassword();

    if (!dryRun) {
      const passwordHash = await bcrypt.hash(password, 12);
      if (existing) {
        await prisma.user.update({
          where: { email: org.email },
          data: { passwordHash, role: "SERVICE", serviceName: org.orgName, name: org.orgName, active: true },
        });
      } else {
        await prisma.user.create({
          data: {
            name: org.orgName,
            email: org.email,
            passwordHash,
            role: "SERVICE",
            serviceName: org.orgName,
            active: true,
          },
        });
      }
    }

    if (existing) reset++;
    else created++;
    slips.push({ ...org, password });
  }

  console.log(`Palveluita hakemistossa: ${orgs.length}`);
  console.log(`  uusia tunnuksia:       ${created}`);
  console.log(`  nollattuja salasanoja: ${reset}`);
  console.log(`  ohitettu (on jo):      ${skipped}`);

  if (dryRun) {
    console.log("\n--dry-run: tietokantaan ei kirjoitettu mitään eikä PDF:ää luotu.");
    return;
  }

  if (slips.length === 0) {
    console.log("\nEi uusia salasanoja, joten PDF:ää ei luotu.");
    console.log("Olemassa olevan tunnuksen salasanaa ei voi tulostaa jälkikäteen — se on tallessa vain tiivisteenä.");
    console.log("Aja --reset-all jos haluat antaa kaikille uudet salasanat ja tulostaa koko nipun.");
    return;
  }

  const qrSvg = await QRCode.toString(loginUrl, {
    type: "svg",
    margin: 0,
    color: { dark: "#1e1b29", light: "#0000" },
  });

  const html = buildHtml(slips, { loginUrlLabel, contactEmail, qrSvg });
  await renderPdf(html, outPath);

  console.log(`\nPDF: ${path.resolve(outPath)} (${slips.length} lappua, ${Math.ceil(slips.length / SLIPS_PER_PAGE)} sivua)`);
  console.log("Tiedosto sisältää salasanat selkokielisenä. Tulosta, leikkaa ja poista tiedosto sen jälkeen.");
  if (resetAll) {
    console.log("HUOM: --reset-all mitätöi kaikki aiemmin jaetut laput.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
