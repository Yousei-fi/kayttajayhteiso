import { renderMarkdown } from "@/lib/markdown";
import { formatDate, formatDateRange, formatDateTime, formatTime, monthGenitive } from "@/lib/week";
import { qrCodeSvg } from "@/lib/qrcode";
import { naIntroParagraphs } from "@/lib/na-meetings";
import { areaOrgName, areaUrl, meetingAddress } from "@/lib/area-format";
import { compareCategories } from "@/lib/directory";
import { ZINE_NAME, zineTagline, candleMarkSvg, flameMarkSvg } from "@/lib/zine-brand";
import type {
  Area,
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
  // The first dialable run, wherever it starts: a phone field may open with
  // a label ("Psykiatrian neuvonta: 050 323 6838 / 03 311 63540") or carry
  // opening hours after the number, and only the number fits the column.
  // Digits joined by at most one space or dash each, so the run stops at the
  // bracket in "040 136 8712 (24/7)" instead of swallowing "(24".
  const number = phoneText.match(/\+?\d(?:[\s\-–]?\d){4,}/);
  return number ? number[0].trim() : phoneText;
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

type EventMeta = { startsAt: Date | null; endsAt: Date | null; location: string | null };

function eventMeta(item: ZineItem): EventMeta {
  const empty: EventMeta = { startsAt: null, endsAt: null, location: null };
  if (!item.metaSnapshot) return empty;
  try {
    const meta = JSON.parse(item.metaSnapshot) as {
      startsAt?: string | null;
      endsAt?: string | null;
      location?: string | null;
    };
    return {
      startsAt: meta.startsAt ? new Date(meta.startsAt) : null,
      endsAt: meta.endsAt ? new Date(meta.endsAt) : null,
      location: meta.location ?? null,
    };
  } catch {
    return empty;
  }
}

/**
 * Builds the full zine document as a standalone HTML string. This exact
 * output is used both for the in-browser preview and, unmodified, as the
 * source Puppeteer renders to PDF — so the preview and the print file can
 * never drift apart.
 *
 * Page order: cover (the paper's name and mark, nothing else) -> who we are
 * -> the community's own meetings and events -> contents -> Tiedotteet ->
 * Artikkelit -> the area's palvelut (+ that week's Kokemukset) -> the area's
 * NA-ryhmät -> a closing "write for us" page. Services/meetings are always
 * listed in full (they're a reference directory, not curated per-edition);
 * only the services' Kokemukset are scoped to the edition's week. The
 * service directory is set as a two-column phonebook (name / short
 * description / phone) because it is long already and grows as entries get
 * filled in.
 */
export async function buildZineHtml(params: {
  edition: EditionWithItems;
  settings: SiteSettings;
  /** The edition's area: its name forms head the sections, and its address
   * and mailbox are what the QR codes point at. */
  area: Area;
  services: ServiceWithExperiences[];
  meetings: NaMeeting[];
  mode: "preview" | "print";
  /** Origin to prefix root-relative asset paths with (needed for PDF rendering, where there is no page origin to resolve them against). */
  assetBaseUrl?: string;
}): Promise<string> {
  const { edition, settings, area, services, meetings, mode, assetBaseUrl } = params;
  const siteUrl = areaUrl(settings, area);
  const orgName = areaOrgName(area);
  const aboutText = area.aboutText || settings.aboutText;
  const submissionEmail = area.submissionEmail;
  const asset = (p: string | null | undefined): string | null => {
    if (!p) return p ?? null;
    if (!assetBaseUrl || !p.startsWith("/")) return p;
    return assetBaseUrl.replace(/\/$/, "") + p;
  };

  const items = edition.items.filter((i) => !i.excluded).sort((a, b) => a.sortOrder - b.sortOrder);
  const alerts = items.filter((i) => i.contentType === "ALERT");
  const articles = items.filter((i) => i.contentType === "ARTICLE");
  // Events print in date order whatever the admin's manual ordering says —
  // a calendar that is not chronological is worse than useless in print.
  const events = items
    .filter((i) => i.contentType === "EVENT")
    .map((item) => ({ item, meta: eventMeta(item) }))
    .sort((a, b) => (a.meta.startsAt?.getTime() ?? 0) - (b.meta.startsAt?.getTime() ?? 0));
  const dateRange = formatDateRange(edition.startDate, edition.endDate);
  // "Syyskuun luettavaa" — the articles section is named for the month it
  // draws from (see articleWindowStart), not for the edition's week.
  const articlesTitle = `${monthGenitive(edition.startDate)} luettavaa`;

  const [kokemuksetQr, submissionQr] = await Promise.all([
    qrCodeSvg(siteUrl),
    submissionEmail ? qrCodeSvg(`mailto:${submissionEmail}`) : Promise.resolve(null),
  ]);

  const sectionTitle = (label: string) =>
    `<h2 class="section-title">${flameMarkSvg("section-flame")}<span>${esc(label)}</span></h2>`;

  const kokemuksetCta = (label: string) => `
    <div class="kokemukset-cta">
      ${kokemuksetQr ? `<div class="cta-qr">${kokemuksetQr}</div>` : ""}
      <p>${esc(label)} <strong>${esc(siteUrl)}</strong></p>
    </div>`;

  const coverHtml = `
  <section class="cover">
    <div class="cover-frame">
      <div class="cover-mark">${candleMarkSvg("candle-mark")}</div>
      <h1 class="cover-title">${esc(ZINE_NAME).replace(" ", "<br />")}</h1>
      <div class="cover-rules"><span></span><span></span></div>
      <p class="cover-tagline">${esc(zineTagline(area))}</p>
      <p class="cover-date">${esc(dateRange)}</p>
    </div>
  </section>`;

  const infoHtml = `
  <section class="info-page">
    ${sectionTitle(orgName)}
    ${
      settings.logoPath
        ? `<img class="info-logo" src="${esc(asset(settings.logoPath)!)}" alt="${esc(orgName)}" />`
        : ""
    }
    ${aboutText ? `<div class="info-body">${renderMarkdown(aboutText)}</div>` : ""}
  </section>`;

  const eventsHtml =
    events.length === 0
      ? ""
      : `
  <section class="events">
    ${sectionTitle("Kokoukset ja tapahtumat")}
    <p class="section-lead">
      Käyttäjäyhteisön omat kokoukset ja tapahtumat. Kaikki ovat tervetulleita, ellei toisin mainita.
    </p>
    <div class="event-list">
      ${events
        .map(({ item, meta }) => {
          const when = meta.startsAt
            ? `${formatDateTime(meta.startsAt)}${meta.endsAt ? `–${formatTime(meta.endsAt)}` : ""}`
            : "";
          const [day, ...rest] = when.split(" klo ");
          return `
        <article class="event">
          <div class="event-when">
            <span class="event-day">${esc(day)}</span>
            ${rest.length > 0 ? `<span class="event-time">klo ${esc(rest.join(" klo "))}</span>` : ""}
          </div>
          <div class="event-main">
            <h3 class="event-title">${esc(item.titleSnapshot)}</h3>
            ${meta.location ? `<div class="event-where">${esc(meta.location)}</div>` : ""}
            <p class="event-body">${esc(item.bodySnapshot)}</p>
          </div>
        </article>`;
        })
        .join("\n")}
    </div>
  </section>`;

  const indexHtml = `
  <section class="index-page">
    ${sectionTitle("Sisällys")}
    <ul class="index-list">
      ${events.length > 0 ? `<li>Kokoukset ja tapahtumat <span>(${events.length})</span></li>` : ""}
      ${alerts.length > 0 ? `<li>Tiedotteet <span>(${alerts.length})</span></li>` : ""}
      ${
        articles.length > 0
          ? `<li>${esc(articlesTitle)}
              <ul>${articles.map((a) => `<li>${esc(a.titleSnapshot)}</li>`).join("")}</ul>
            </li>`
          : ""
      }
      ${services.length > 0 ? `<li>${esc(area.nameGenitive)} palvelut <span>(${services.length})</span></li>` : ""}
      ${meetings.length > 0 ? `<li>${esc(area.nameGenitive)} NA-ryhmät <span>(${meetings.length})</span></li>` : ""}
      <li>Kirjoita meille</li>
    </ul>
  </section>`;

  const alertsHtml =
    alerts.length === 0
      ? ""
      : `
  <section class="alerts">
    ${sectionTitle("Tiedotteet")}
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
    ${sectionTitle(articlesTitle)}
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
  // An area still writing its services list prints no empty section.
  const servicesHtml =
    services.length === 0
      ? ""
      : `
  <section class="directory">
    ${sectionTitle(`${area.nameGenitive} palvelut`)}
    <p class="section-lead">
      Hakemisto ${esc(area.nameGenitive)} päihde- ja mielenterveyspalveluista, järjestöistä ja vertaistuesta.
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

  const meetingsHtml =
    meetings.length === 0
      ? ""
      : `
  <section class="directory">
    ${sectionTitle(`${area.nameGenitive} NA-ryhmät`)}
    <div class="na-intro">
      ${naIntroParagraphs(area).map((para) => `<p>${esc(para)}</p>`).join("")}
    </div>
    <div class="tel-book">
      ${groupByWeekday(meetings)
        .map(
          ([weekday, group]) => `
        <div class="dir-group">
          <h4 class="tel-category">${esc(weekday)}</h4>
          ${group
            .map(
              (m) => `
            <div class="dir-row">
              <strong>klo ${esc(m.time)} · ${esc(m.name)}</strong>
              ${esc(meetingAddress(area, m) ?? "")}
            </div>`,
            )
            .join("")}
        </div>`,
        )
        .join("")}
    </div>
  </section>`;

  const finalHtml =
    !submissionEmail
      ? ""
      : `
  <section class="final-page">
    ${submissionQr ? `<div class="cta-qr large">${submissionQr}</div>` : ""}
    <p class="final-question">Haluatko kirjoituksesi seuraavaan lehteen?</p>
    <p>Ota yhteyttä sähköpostitse: <strong>${esc(submissionEmail)}</strong></p>
    <p class="final-alt">Tai pyydä lehden jakajaa kirjaamaan ylös kuulumisesi!</p>
    <div class="final-mark">${candleMarkSvg("candle-mark")}</div>
    <p class="final-name">${esc(ZINE_NAME)}</p>
  </section>`;

  return `<!doctype html>
<html lang="fi">
<head>
<meta charset="utf-8" />
<title>${esc(ZINE_NAME)} ${esc(dateRange)}</title>
<style>${zineCss(mode)}</style>
</head>
<body>
<div class="sheet">
${coverHtml}
${infoHtml}
${eventsHtml}
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
  return [...map.entries()].sort(([a], [b]) => compareCategories(a, b));
}

function groupByWeekday(meetings: NaMeeting[]): [string, NaMeeting[]][] {
  const map = new Map<string, NaMeeting[]>();
  for (const m of meetings) {
    if (!map.has(m.weekday)) map.set(m.weekday, []);
    map.get(m.weekday)!.push(m);
  }
  return [...map.entries()];
}

/**
 * The paper's look: condensed poster headlines, a typewriter hand for every
 * date, byline and number, and a serif for reading — the three voices a
 * photocopied street paper has always had.
 *
 * Two constraints shape all of it. Fonts must be ones a bare Linux container
 * actually has (the Dockerfile installs fonts-liberation, whose Narrow and
 * Mono faces are what the display and mono stacks resolve to; everything
 * else in each stack is a fallback for whoever previews in a browser). And
 * it gets printed on whatever machine is to hand, so the weight comes from
 * rules, outlines and white space rather than from filled areas — a solid
 * panel is only ever a thin bar or a small tag, never a field.
 */
function zineCss(mode: "preview" | "print"): string {
  return `
    :root {
      --ink: #1a1723;
      --accent: #7137e3;
      --accent-2: #2f8fe0;
      --paper: #fffdfe;
      --muted: #6b6478;
      --line: #d9d2e8;
      --display: "Liberation Sans Narrow", "Arial Narrow", "Helvetica Neue Condensed",
        "Nimbus Sans Narrow", Impact, "Haettenschweiler", Arial, sans-serif;
      --body: "Liberation Serif", Georgia, "Iowan Old Style", "Times New Roman", serif;
      --mono: "Liberation Mono", "Courier New", "Nimbus Mono PS", monospace;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: var(--body);
      color: var(--ink);
      background: ${mode === "preview" ? "#e3ddef" : "var(--paper)"};
    }
    .sheet {
      background: var(--paper);
      ${mode === "preview" ? "max-width: 210mm; margin: 24px auto; padding: 18mm 15mm; box-shadow: 0 4px 24px rgba(0,0,0,0.25);" : "padding: 0;"}
    }
    h1, h2, h3, h4 { font-family: var(--display); margin: 0 0 0.3em; break-after: avoid; }
    p { orphans: 3; widows: 3; }
    .muted { color: var(--muted); font-size: 13px; font-family: var(--mono); }

    /* ---- cover: the paper's name and mark, nothing else ---- */
    .cover {
      page-break-after: always;
      break-after: page;
      height: 245mm;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .cover-frame {
      width: 100%;
      text-align: center;
      border-top: 4mm solid var(--ink);
      border-bottom: 1.2mm solid var(--ink);
      padding: 12mm 6mm 10mm;
      position: relative;
    }
    .cover-mark { color: var(--ink); margin-bottom: 7mm; }
    .cover-mark .candle-mark { height: 46mm; width: auto; }
    .cover-title {
      font-family: var(--display);
      font-size: 76px;
      /* Poster-tight, but not tighter: at much under 1.0 the umlaut of a
         second-line Ä rides up into the line above and reads as a typo,
         and this is Finnish — nearly every headline has one. */
      line-height: 0.98;
      letter-spacing: -0.015em;
      text-transform: uppercase;
      margin: 0 0 6mm;
    }
    .cover-rules { display: flex; flex-direction: column; gap: 1.2mm; align-items: center; margin-bottom: 5mm; }
    .cover-rules span { display: block; height: 1px; background: var(--ink); width: 70%; }
    .cover-rules span:first-child { height: 2.2mm; background: var(--accent); width: 46%; }
    .cover-tagline {
      font-family: var(--mono);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.22em;
      margin: 0 0 3mm;
    }
    .cover-date { font-family: var(--display); font-size: 21px; letter-spacing: 0.08em; margin: 0; }

    /* ---- section heads: two rules and a flame, cheap to print ---- */
    .section-title {
      font-size: 30px;
      line-height: 1.05;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      border-top: 2.5mm solid var(--ink);
      border-bottom: 0.5mm solid var(--ink);
      padding: 2mm 0 1.5mm;
      margin: 0 0 5mm;
      display: flex;
      align-items: center;
      gap: 2.5mm;
    }
    .section-flame { height: 8mm; width: auto; color: var(--accent); flex-shrink: 0; }
    .subsection-title {
      font-size: 18px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 8mm;
      margin-bottom: 3mm;
      border-bottom: 0.4mm solid var(--ink);
      padding-bottom: 1mm;
    }
    .section-lead {
      font-family: var(--mono);
      font-size: 10.5px;
      line-height: 1.5;
      margin: 0 0 5mm;
      max-width: 150mm;
    }

    /* ---- who we are ---- */
    .info-page { page-break-before: always; break-before: page; }
    .info-logo { max-height: 34mm; margin-bottom: 6mm; }
    .info-body { font-size: 14px; line-height: 1.62; max-width: 155mm; }
    .info-body p { margin: 0 0 0.85em; }
    .info-body p:first-of-type::first-letter {
      float: left;
      font-family: var(--display);
      font-size: 54px;
      line-height: 0.8;
      padding: 1mm 2mm 0 0;
      color: var(--accent);
    }

    /* ---- the community's own calendar ---- */
    .events { page-break-before: always; break-before: page; }
    .event-list { display: flex; flex-direction: column; }
    .event {
      display: grid;
      grid-template-columns: 34mm 1fr;
      gap: 5mm;
      padding: 4mm 0;
      border-top: 0.4mm dashed var(--ink);
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .event:last-child { border-bottom: 0.4mm dashed var(--ink); }
    .event-when { font-family: var(--display); text-transform: uppercase; line-height: 1.1; }
    .event-day { display: block; font-size: 21px; letter-spacing: 0.02em; }
    .event-time { display: block; font-size: 13px; color: var(--accent); letter-spacing: 0.06em; }
    .event-title { font-size: 21px; margin: 0 0 1mm; }
    .event-where {
      font-family: var(--mono);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 1.5mm;
    }
    .event-body { font-size: 12.5px; line-height: 1.45; margin: 0; }

    /* ---- contents ---- */
    .index-page { page-break-before: always; break-before: page; }
    .index-list { list-style: none; padding: 0; font-family: var(--display); font-size: 20px; text-transform: uppercase; }
    .index-list > li { border-bottom: 0.3mm dotted var(--ink); padding: 2.5mm 0; }
    .index-list span { color: var(--accent); font-size: 14px; }
    .index-list ul {
      list-style: none;
      padding: 1.5mm 0 0 6mm;
      margin: 0;
      font-family: var(--body);
      font-size: 12px;
      text-transform: none;
      color: var(--muted);
      line-height: 1.5;
    }

    /* ---- service announcements ---- */
    .alerts { page-break-before: always; break-before: page; margin-bottom: 10mm; }
    .alert-grid { display: flex; flex-direction: column; gap: 5mm; }
    .alert-card {
      border: 0.4mm dashed var(--ink);
      border-left: 1.2mm solid var(--accent-2);
      padding: 4mm 5mm;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .alert-service {
      font-family: var(--mono);
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--accent-2);
    }
    .alert-title { font-size: 20px; margin: 1mm 0 1.5mm; text-transform: uppercase; }
    .alert-body { font-size: 13px; margin: 0; line-height: 1.45; }
    .alert-dates { font-family: var(--mono); font-size: 9.5px; color: var(--muted); margin-top: 2mm; }

    /* ---- articles ---- */
    .articles { page-break-before: always; break-before: page; display: flex; flex-direction: column; gap: 10mm; }
    .article { break-inside: avoid-page; }
    .article-title { font-size: 34px; line-height: 1.02; text-transform: uppercase; }
    .article-byline {
      font-family: var(--mono);
      font-size: 10px;
      color: var(--ink);
      text-transform: uppercase;
      letter-spacing: 0.16em;
      border-bottom: 0.4mm solid var(--ink);
      padding-bottom: 1.5mm;
      margin-bottom: 4mm;
    }
    .article-image { width: 100%; max-height: 90mm; object-fit: cover; margin-bottom: 4mm; }
    .article-body { font-size: 14px; line-height: 1.62; }
    .article-body p { margin: 0 0 0.85em; }
    .article-body > p:first-child::first-letter {
      float: left;
      font-family: var(--display);
      font-size: 54px;
      line-height: 0.8;
      padding: 1mm 2mm 0 0;
      color: var(--accent);
    }
    .article-body img { max-width: 100%; }
    .article-body h1, .article-body h2, .article-body h3 {
      font-size: 1.15em;
      text-transform: uppercase;
      margin-top: 1em;
    }

    /* ---- directories ---- */
    .directory { page-break-before: always; break-before: page; }
    /* A meeting time separated from its weekday heading by a column break
       is worse than a slightly uneven column, so each weekday travels as
       one block. Service categories can't do this — one of them runs to 55
       entries — but a service entry carries its own name and number, so it
       still reads on its own. */
    .dir-group { break-inside: avoid; page-break-inside: avoid; }
    .dir-row {
      break-inside: avoid;
      page-break-inside: avoid;
      padding: 0.9mm 0;
      font-size: 10px;
      line-height: 1.4;
      border-bottom: 0.3mm dotted var(--line);
    }
    .dir-row strong { margin-right: 4px; font-family: var(--display); font-size: 12px; text-transform: uppercase; }

    /* Phonebook listing for the area's palvelut: two columns of
       name / short description / phone entries, kept dense because the
       directory is long and still growing. */
    .tel-book { column-count: 2; column-gap: 7mm; column-rule: 0.3mm solid var(--line); }
    .tel-category {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border-top: 0.8mm solid var(--ink);
      border-bottom: 0.3mm solid var(--ink);
      padding: 1mm 0;
      margin: 5mm 0 2mm;
      break-after: avoid;
      page-break-after: avoid;
    }
    .tel-category:first-child { margin-top: 0; }
    .tel-entry {
      break-inside: avoid;
      page-break-inside: avoid;
      padding: 1.1mm 0;
      border-bottom: 0.3mm dotted var(--line);
    }
    .tel-head { display: flex; align-items: baseline; justify-content: space-between; gap: 3mm; }
    .tel-name {
      min-width: 0;
      font-family: var(--display);
      font-size: 12px;
      font-weight: 700;
      line-height: 1.2;
      text-transform: uppercase;
    }
    .tel-number {
      font-family: var(--mono);
      font-size: 10px;
      font-weight: 700;
      color: var(--accent);
      white-space: nowrap;
      flex-shrink: 0;
    }
    .tel-desc { font-size: 9.5px; line-height: 1.35; margin-top: 0.3mm; }
    .tel-addr { font-family: var(--mono); font-size: 8.5px; line-height: 1.3; color: var(--muted); margin-top: 0.3mm; }

    .na-intro {
      font-size: 12.5px;
      line-height: 1.55;
      margin-bottom: 7mm;
      padding-left: 4mm;
      border-left: 1.2mm solid var(--accent);
      max-width: 150mm;
      break-inside: avoid;
    }
    .na-intro p { margin: 0 0 0.7em; }
    .na-intro p:last-child { margin-bottom: 0; }

    /* ---- Kokemukset ---- */
    .kokemus-grid { display: flex; flex-direction: column; gap: 3mm; }
    .kokemus-group { break-inside: avoid; border-left: 1mm solid var(--accent-2); padding: 1mm 0 1mm 4mm; }
    .kokemus-target {
      font-family: var(--mono);
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--accent-2);
    }
    .kokemus-body { font-size: 12px; margin: 1mm 0; line-height: 1.45; }

    /* Kept deliberately small: it trails a section that ends wherever the
       content happens to end, and as an unbreakable block a taller one
       spills onto a page of its own — a blank sheet in a printed zine. */
    .kokemukset-cta {
      margin-top: 5mm;
      display: flex;
      align-items: center;
      gap: 3mm;
      border-top: 0.4mm dashed var(--ink);
      padding-top: 3mm;
      break-inside: avoid;
    }
    .kokemukset-cta p { font-family: var(--mono); font-size: 10px; margin: 0; line-height: 1.45; }
    .cta-qr { width: 16mm; height: 16mm; flex-shrink: 0; }
    .cta-qr svg { width: 100%; height: 100%; }
    .cta-qr.large { width: 35mm; height: 35mm; margin: 0 auto 6mm; }

    /* ---- closing page ---- */
    .final-page {
      page-break-before: always;
      break-before: page;
      text-align: center;
      padding-top: 34mm;
    }
    /* Scoped through .final-page so the generic ".final-page p" size below
       cannot out-specify it. */
    .final-page .final-question {
      font-family: var(--display);
      font-size: 30px;
      line-height: 1.05;
      text-transform: uppercase;
      max-width: 130mm;
      margin: 0 auto 4mm;
    }
    .final-page p { font-size: 14px; }
    .final-alt { max-width: 125mm; margin: 4mm auto 0; font-weight: 700; color: var(--accent); }
    .final-mark { margin-top: 16mm; color: var(--ink); }
    .final-mark .candle-mark { height: 22mm; width: auto; }
    .final-name {
      font-family: var(--display);
      font-size: 16px;
      text-transform: uppercase;
      letter-spacing: 0.24em;
      margin: 3mm 0 0;
    }
  `;
}
