import { renderMarkdown } from "@/lib/markdown";
import { formatDate, formatDateRange } from "@/lib/week";
import { qrCodeSvg } from "@/lib/qrcode";
import { NA_INTRO_PARAGRAPHS } from "@/lib/na-meetings";
import type {
  DirectoryService,
  Experience,
  NaMeeting,
  SiteSettings,
  ZineEdition,
  ZineItem,
} from "@prisma/client";

type EditionWithItems = ZineEdition & { items: ZineItem[] };
type ServiceWithExperiences = DirectoryService & { experiences: Experience[] };


function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const MAX_DESCRIPTION_CHARS = 110;

/**
 * The dialable part of a directory entry's phone field. Some entries append
 * opening hours to the number ("0400 734 793, maanantaista torstaihin klo
 * 10–12"); the phonebook listing prints only the number, keeping its column
 * narrow, and the hours survive in the entry's description.
 */
function phoneNumber(phone: string | null): string {
  const phoneText = (phone ?? "").trim();
  const leadingNumber = phoneText.match(/^\+?[\d][\d\s()\-–]*/);
  return leadingNumber ? leadingNumber[0].replace(/[\s\-–]+$/, "") : phoneText;
}

/**
 * Condenses a directory entry's description into the one printable line the
 * zine's phonebook listing allows. Most entries repeat their own phone
 * number in the description ("Puhelin: 116 117 Kiireelliset…"), which the
 * listing already prints in its own column, so the number and its label are
 * dropped — along with the punctuation left behind — before the text is
 * clipped at a word boundary.
 */
function shortDescription(description: string | null, phone: string | null): string {
  let text = (description ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";

  const digits = phoneNumber(phone).replace(/\D/g, "");
  if (digits.length >= 5) {
    const spacedDigits = digits.split("").join("[\\s()\\-–]*");
    text = text.replace(
      new RegExp(`(?:puhelin|puh\\.?|ajanvaraus|soita|numero)?\\s*:?\\s*\\+?${spacedDigits}`, "gi"),
      " ",
    );
    text = text
      .replace(/\s+/g, " ")
      .replace(/\s+([.,;:])/g, "$1")
      .replace(/([.,;:])\s*\1+/g, "$1")
      .replace(/^[\s.,;:–—-]+/, "")
      .trim();
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }
  if (!text) return "";
  if (text.length <= MAX_DESCRIPTION_CHARS) return text;

  const clipped = text.slice(0, MAX_DESCRIPTION_CHARS);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${(lastSpace > 40 ? clipped.slice(0, lastSpace) : clipped).replace(/[.,;:]$/, "")}…`;
}

function alertMeta(item: ZineItem): string {
  if (!item.metaSnapshot) return "";
  try {
    const meta = JSON.parse(item.metaSnapshot) as {
      validFrom?: string | null;
      validUntil?: string | null;
    };
    const parts: string[] = [];
    if (meta.validFrom) parts.push(`alkaen ${formatDate(meta.validFrom)}`);
    if (meta.validUntil) parts.push(`voimassa ${formatDate(meta.validUntil)}`);
    return parts.join(" · ");
  } catch {
    return "";
  }
}

/**
 * Builds the full zine document as a standalone HTML string. This exact
 * output is used both for the in-browser preview and, unmodified, as the
 * source Puppeteer renders to PDF — so the preview and the print file can
 * never drift apart.
 *
 * Page order: cover (logo + "Tietoa meistä" text) -> index -> Tiedotteet
 * -> Artikkelit -> Tampereen palvelut (+ that week's Kokemukset) ->
 * Tampereen NA-ryhmät -> a closing "write for us" page.
 * Services/meetings are always listed in full (they're a reference
 * directory, not curated per-edition); only the services' Kokemukset are
 * scoped to the edition's week. The service directory is set as a
 * two-column phonebook (name / short description / phone) because it is
 * long already and grows as entries get filled in.
 */
export async function buildZineHtml(params: {
  edition: EditionWithItems;
  settings: SiteSettings;
  services: ServiceWithExperiences[];
  meetings: NaMeeting[];
  mode: "preview" | "print";
  /** Origin to prefix root-relative asset paths with (needed for PDF rendering, where there is no page origin to resolve them against). */
  assetBaseUrl?: string;
}): Promise<string> {
  const { edition, settings, services, meetings, mode, assetBaseUrl } = params;
  const asset = (p: string | null | undefined): string | null => {
    if (!p) return p ?? null;
    if (!assetBaseUrl || !p.startsWith("/")) return p;
    return assetBaseUrl.replace(/\/$/, "") + p;
  };

  const items = edition.items.filter((i) => !i.excluded).sort((a, b) => a.sortOrder - b.sortOrder);
  const alerts = items.filter((i) => i.contentType === "ALERT");
  const articles = items.filter((i) => i.contentType === "ARTICLE");
  const dateRange = formatDateRange(edition.startDate, edition.endDate);

  const [kokemuksetQr, submissionQr] = await Promise.all([
    settings.publicSiteUrl ? qrCodeSvg(settings.publicSiteUrl) : Promise.resolve(null),
    settings.submissionEmail ? qrCodeSvg(`mailto:${settings.submissionEmail}`) : Promise.resolve(null),
  ]);

  const kokemuksetCta = (label: string) =>
    !settings.publicSiteUrl
      ? ""
      : `
    <div class="kokemukset-cta">
      ${kokemuksetQr ? `<div class="cta-qr">${kokemuksetQr}</div>` : ""}
      <p>${esc(label)} <strong>${esc(settings.publicSiteUrl)}</strong></p>
    </div>`;

  const coverHtml = `
  <section class="cover">
    <img class="cover-logo" src="${esc(asset(settings.logoPath)!)}" alt="${esc(settings.orgName)}" />
    <div class="cover-range">Viikkolehti ${esc(dateRange)}</div>
    <h1 class="cover-title">${esc(settings.orgName)}</h1>
    ${settings.aboutText ? `<div class="cover-about">${renderMarkdown(settings.aboutText)}</div>` : ""}
  </section>`;

  const indexHtml = `
  <section class="index-page">
    <h2 class="section-title">Sisällys</h2>
    <ul class="index-list">
      ${alerts.length > 0 ? `<li>Tiedotteet <span>(${alerts.length})</span></li>` : ""}
      ${
        articles.length > 0
          ? `<li>Artikkelit
              <ul>${articles.map((a) => `<li>${esc(a.titleSnapshot)}</li>`).join("")}</ul>
            </li>`
          : ""
      }
      <li>Tampereen palvelut <span>(${services.length})</span></li>
      <li>Tampereen NA-ryhmät <span>(${meetings.length})</span></li>
      <li>Kirjoita meille</li>
    </ul>
  </section>`;

  const alertsHtml =
    alerts.length === 0
      ? ""
      : `
  <section class="alerts">
    <h2 class="section-title">Tiedotteet</h2>
    <div class="alert-grid">
      ${alerts
        .map(
          (a) => `
        <article class="alert-card">
          <div class="alert-service">${esc(a.authorSnapshot)}</div>
          <h3 class="alert-title">${esc(a.titleSnapshot)}</h3>
          <p class="alert-body">${esc(a.bodySnapshot)}</p>
          ${alertMeta(a) ? `<div class="alert-dates">${esc(alertMeta(a))}</div>` : ""}
        </article>`,
        )
        .join("\n")}
    </div>
  </section>`;

  const articlesHtml =
    articles.length === 0
      ? ""
      : `
  <section class="articles">
    <h2 class="section-title">Artikkelit</h2>
    ${articles
      .map(
        (a) => `
      <article class="article">
        <h3 class="article-title">${esc(a.titleSnapshot)}</h3>
        <div class="article-byline">${esc(a.authorSnapshot)}</div>
        ${a.imageSnapshot ? `<img class="article-image" src="${esc(asset(a.imageSnapshot)!)}" alt="" />` : ""}
        <div class="article-body">${renderMarkdown(a.bodySnapshot)}</div>
      </article>`,
      )
      .join("\n")}
  </section>`;

  const servicesWithNews = services.filter((s) => s.experiences.length > 0);
  const servicesHtml = `
  <section class="directory">
    <h2 class="section-title">Tampereen palvelut</h2>
    <p class="section-lead">
      Hakemisto Tampereen päihde- ja mielenterveyspalveluista, järjestöistä ja vertaistuesta.
      Tämä ei ole kattava lista — täydennämme sitä sitä mukaa kun tietoa kertyy.
    </p>
    <div class="tel-book">
      ${groupByCategory(services)
        .map(
          ([category, group]) => `
        <h4 class="tel-category">${esc(category)}</h4>
        ${group
          .map((s) => {
            const desc = shortDescription(s.description, s.phone);
            return `
          <div class="tel-entry">
            <div class="tel-head">
              <span class="tel-name">${esc(s.name)}</span>
              ${s.phone ? `<span class="tel-number">${esc(phoneNumber(s.phone))}</span>` : ""}
            </div>
            ${desc ? `<div class="tel-desc">${esc(desc)}</div>` : ""}
            ${s.address ? `<div class="tel-addr">${esc(s.address)}</div>` : ""}
          </div>`;
          })
          .join("")}`,
        )
        .join("")}
    </div>

    <h3 class="subsection-title">Uudet kokemukset tällä viikolla</h3>
    ${
      servicesWithNews.length === 0
        ? `<p class="muted">Ei uusia kokemuksia tällä viikolla.</p>`
        : `<div class="kokemus-grid">
            ${servicesWithNews
              .map(
                (s) => `
              <div class="kokemus-group">
                <div class="kokemus-target">${esc(s.name)}</div>
                ${s.experiences
                  .map((e) => `<p class="kokemus-body">${esc(e.body)}</p>`)
                  .join("")}
              </div>`,
              )
              .join("")}
          </div>`
    }
    ${kokemuksetCta("Haluatko selata kaikkia kokemuksia tai jakaa omasi? Suuntaa sivustolle:")}
  </section>`;

  const meetingsHtml = `
  <section class="directory">
    <h2 class="section-title">Tampereen NA-ryhmät</h2>
    <div class="na-intro">
      ${NA_INTRO_PARAGRAPHS.map((para) => `<p>${esc(para)}</p>`).join("")}
    </div>
    <div class="dir-list">
      ${groupByWeekday(meetings)
        .map(
          ([weekday, group]) => `
        <h4 class="dir-category">${esc(weekday)}</h4>
        ${group
          .map(
            (m) => `
          <div class="dir-row">
            <strong>klo ${esc(m.time)} · ${esc(m.name)}</strong>
            ${m.address ? esc(m.address) : ""}
          </div>`,
          )
          .join("")}`,
        )
        .join("")}
    </div>
  </section>`;

  const finalHtml =
    !settings.submissionEmail
      ? ""
      : `
  <section class="final-page">
    ${submissionQr ? `<div class="cta-qr large">${submissionQr}</div>` : ""}
    <p class="final-question">Haluatko kirjoituksesi seuraavaan lehteen?</p>
    <p>Ota yhteyttä sähköpostitse: <strong>${esc(settings.submissionEmail)}</strong></p>
    <p class="final-alt">Tai pyydä lehden jakajaa kirjaamaan ylös kuulumisesi!</p>
  </section>`;

  return `<!doctype html>
<html lang="fi">
<head>
<meta charset="utf-8" />
<title>Viikkolehti ${esc(dateRange)}</title>
<style>${zineCss(mode)}</style>
</head>
<body>
<div class="sheet">
${coverHtml}
${indexHtml}
${alertsHtml}
${articlesHtml}
${servicesHtml}
${meetingsHtml}
${finalHtml}
</div>
</body>
</html>`;
}

function groupByCategory(services: ServiceWithExperiences[]): [string, ServiceWithExperiences[]][] {
  const map = new Map<string, ServiceWithExperiences[]>();
  for (const s of services) {
    if (!map.has(s.category)) map.set(s.category, []);
    map.get(s.category)!.push(s);
  }
  return [...map.entries()];
}

function groupByWeekday(meetings: NaMeeting[]): [string, NaMeeting[]][] {
  const map = new Map<string, NaMeeting[]>();
  for (const m of meetings) {
    if (!map.has(m.weekday)) map.set(m.weekday, []);
    map.get(m.weekday)!.push(m);
  }
  return [...map.entries()];
}

function zineCss(mode: "preview" | "print"): string {
  return `
    :root {
      --ink: #1e1b29;
      --accent: #7137e3;
      --accent-2: #2f8fe0;
      --paper: #fffdfe;
      --muted: #6b6478;
      --line: #e3ddf0;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Georgia", "Iowan Old Style", serif;
      color: var(--ink);
      background: ${mode === "preview" ? "#e3ddef" : "var(--paper)"};
    }
    .sheet {
      background: var(--paper);
      ${mode === "preview" ? "max-width: 210mm; margin: 24px auto; padding: 18mm 15mm; box-shadow: 0 4px 24px rgba(0,0,0,0.25);" : "padding: 0;"}
    }
    h1, h2, h3, h4 { font-family: "Helvetica Neue", Arial, sans-serif; margin: 0 0 0.3em; break-after: avoid; }
    p { orphans: 3; widows: 3; }
    .muted { color: var(--muted); font-size: 13px; }

    .cover {
      text-align: center;
      padding: 10mm 0 14mm;
      border-bottom: 4px solid var(--accent);
      margin-bottom: 10mm;
      page-break-after: always;
      break-after: page;
    }
    .cover-logo { max-height: 30mm; margin-bottom: 6mm; }
    .cover-range { text-transform: uppercase; letter-spacing: 0.12em; color: var(--accent-2); font-weight: 700; font-size: 12px; }
    .cover-title { font-size: 30px; color: var(--ink); margin-top: 4px; margin-bottom: 8mm; }
    .cover-about { text-align: left; max-width: 140mm; margin: 0 auto; font-size: 13px; line-height: 1.6; }
    .cover-about p { margin: 0 0 0.8em; }

    .index-page { page-break-after: always; break-after: page; }
    .index-list { list-style: none; padding: 0; font-size: 15px; line-height: 2; }
    .index-list > li { border-bottom: 1px solid var(--line); padding: 2mm 0; }
    .index-list span { color: var(--muted); font-size: 12px; }
    .index-list ul { list-style: none; padding: 1mm 0 1mm 6mm; margin: 0; font-size: 12px; color: var(--muted); line-height: 1.6; }

    .section-title {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #fff;
      background: var(--accent);
      display: inline-block;
      padding: 3px 10px;
      margin-bottom: 6mm;
    }
    .subsection-title { font-size: 15px; margin-top: 8mm; margin-bottom: 3mm; }
    .section-lead { font-size: 11.5px; line-height: 1.5; color: var(--muted); margin: 0 0 5mm; max-width: 150mm; }

    .na-intro {
      font-size: 12px;
      line-height: 1.55;
      margin-bottom: 7mm;
      padding-left: 4mm;
      border-left: 3px solid var(--accent);
      max-width: 150mm;
      break-inside: avoid;
    }
    .na-intro p { margin: 0 0 0.7em; }
    .na-intro p:last-child { margin-bottom: 0; }

    .alerts { page-break-before: always; break-before: page; margin-bottom: 10mm; }
    .alert-grid { display: flex; flex-direction: column; gap: 5mm; }
    .alert-card {
      border: 1px solid var(--line);
      border-left: 4px solid var(--accent-2);
      padding: 4mm 5mm;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .alert-service { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent-2); font-weight: 700; font-family: "Helvetica Neue", Arial, sans-serif; }
    .alert-title { font-size: 16px; margin: 2px 0 3px; }
    .alert-body { font-size: 13px; margin: 0; line-height: 1.4; }
    .alert-dates { font-size: 10px; color: var(--muted); margin-top: 3px; font-family: "Helvetica Neue", Arial, sans-serif; }

    .articles { page-break-before: always; break-before: page; display: flex; flex-direction: column; gap: 10mm; }
    .article { break-inside: avoid-page; }
    .article-title { font-size: 22px; }
    .article-byline { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; font-family: "Helvetica Neue", Arial, sans-serif; margin-bottom: 4mm; }
    .article-image { width: 100%; max-height: 90mm; object-fit: cover; margin-bottom: 4mm; }
    .article-body { font-size: 14px; line-height: 1.6; }
    .article-body p { margin: 0 0 0.8em; }
    .article-body img { max-width: 100%; }
    .article-body h1, .article-body h2, .article-body h3 { font-size: 1.1em; margin-top: 1em; }

    .directory { page-break-before: always; break-before: page; }
    .dir-list { column-count: 1; font-size: 11px; line-height: 1.5; }
    .dir-category {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--accent-2);
      margin-top: 5mm;
      margin-bottom: 1mm;
      break-after: avoid;
    }
    .dir-row { break-inside: avoid; padding: 0.6mm 0; }
    .dir-row strong { margin-right: 4px; }

    /* Phonebook listing for Tampereen palvelut: two columns of
       name / short description / phone entries, kept dense because the
       directory is long and still growing. */
    .tel-book { column-count: 2; column-gap: 7mm; column-rule: 1px solid var(--line); }
    .tel-category {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #fff;
      background: var(--accent-2);
      padding: 1mm 2mm;
      margin: 4mm 0 1.5mm;
      break-after: avoid;
      page-break-after: avoid;
    }
    .tel-category:first-child { margin-top: 0; }
    .tel-entry {
      break-inside: avoid;
      page-break-inside: avoid;
      padding: 1.1mm 0;
      border-bottom: 1px dotted var(--line);
    }
    .tel-head { display: flex; align-items: baseline; justify-content: space-between; gap: 3mm; }
    .tel-name { min-width: 0; }
    .tel-name {
      font-family: "Helvetica Neue", Arial, sans-serif;
      font-size: 10px;
      font-weight: 700;
      line-height: 1.3;
    }
    .tel-number {
      font-family: "Helvetica Neue", Arial, sans-serif;
      font-size: 10px;
      font-weight: 700;
      color: var(--accent);
      white-space: nowrap;
      flex-shrink: 0;
    }
    .tel-desc { font-size: 9.5px; line-height: 1.35; margin-top: 0.3mm; }
    .tel-addr { font-size: 9px; line-height: 1.3; color: var(--muted); margin-top: 0.2mm; }

    .kokemus-grid { display: flex; flex-direction: column; gap: 3mm; }
    .kokemus-group { break-inside: avoid; border-left: 3px solid var(--accent-2); padding: 1mm 0 1mm 4mm; }
    .kokemus-target { font-size: 11px; font-weight: 700; color: var(--accent-2); font-family: "Helvetica Neue", Arial, sans-serif; }
    .kokemus-body { font-size: 12px; margin: 1mm 0; line-height: 1.4; }

    /* Kept deliberately small: it trails a section that ends wherever the
       content happens to end, and as an unbreakable block a taller one
       spills onto a page of its own — a blank sheet in a printed zine. */
    .kokemukset-cta {
      margin-top: 5mm;
      display: flex;
      align-items: center;
      gap: 3mm;
      border-top: 1px solid var(--line);
      padding-top: 3mm;
      break-inside: avoid;
    }
    .kokemukset-cta p { font-size: 11px; margin: 0; }
    .cta-qr { width: 16mm; height: 16mm; flex-shrink: 0; }
    .cta-qr svg { width: 100%; height: 100%; }
    .cta-qr.large { width: 35mm; height: 35mm; margin: 0 auto 6mm; }

    .final-page {
      page-break-before: always;
      break-before: page;
      text-align: center;
      padding-top: 40mm;
    }
    .final-question { font-size: 20px; font-weight: 700; max-width: 130mm; margin: 0 auto 4mm; }
    .final-page p { font-size: 14px; }
    .final-alt { max-width: 120mm; margin: 4mm auto 0; font-weight: 700; color: var(--accent); }
  `;
}
