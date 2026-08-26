import { renderMarkdown } from "@/lib/markdown";
import { formatDate, formatDateRange } from "@/lib/week";
import type { SiteSettings, ZineEdition, ZineItem } from "@prisma/client";

type EditionWithItems = ZineEdition & { items: ZineItem[] };

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
 */
export function buildZineHtml(params: {
  edition: EditionWithItems;
  settings: SiteSettings;
  mode: "preview" | "print";
  /** Origin to prefix root-relative asset paths with (needed for PDF rendering, where there is no page origin to resolve them against). */
  assetBaseUrl?: string;
}): string {
  const { edition, settings, mode, assetBaseUrl } = params;
  const asset = (p: string | null | undefined): string | null => {
    if (!p) return p ?? null;
    if (!assetBaseUrl || !p.startsWith("/")) return p;
    return assetBaseUrl.replace(/\/$/, "") + p;
  };
  const items = edition.items
    .filter((i) => !i.excluded)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const alerts = items.filter((i) => i.contentType === "ALERT");
  const articles = items.filter((i) => i.contentType === "ARTICLE");
  const dateRange = formatDateRange(edition.startDate, edition.endDate);

  const alertsSection =
    alerts.length === 0
      ? ""
      : `
    <section class="alerts">
      <h2 class="section-title">Palveluiden ilmoitukset</h2>
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

  const articlesSection =
    articles.length === 0
      ? ""
      : `
    <section class="articles">
      ${articles
        .map(
          (a) => `
        <article class="article">
          <h2 class="article-title">${esc(a.titleSnapshot)}</h2>
          <div class="article-byline">${esc(a.authorSnapshot)}</div>
          ${a.imageSnapshot ? `<img class="article-image" src="${esc(asset(a.imageSnapshot)!)}" alt="" />` : ""}
          <div class="article-body">${renderMarkdown(a.bodySnapshot)}</div>
        </article>`,
        )
        .join("\n")}
    </section>`;

  const teaser = articles
    .slice(0, 3)
    .map((a) => a.titleSnapshot)
    .join("  ·  ");

  return `<!doctype html>
<html lang="fi">
<head>
<meta charset="utf-8" />
<title>Viikkolehti ${esc(dateRange)}</title>
<style>${zineCss(mode)}</style>
</head>
<body>
<div class="sheet">

  <section class="cover">
    <img class="cover-logo" src="${esc(asset(settings.logoPath)!)}" alt="${esc(settings.orgName)}" />
    <div class="cover-org">${esc(settings.orgName)}</div>
    <h1 class="cover-title">Viikkolehti</h1>
    <div class="cover-range">${esc(dateRange)}</div>
    ${edition.coverNote ? `<p class="cover-note">${esc(edition.coverNote)}</p>` : ""}
    ${teaser ? `<p class="cover-teaser">${esc(teaser)}</p>` : ""}
  </section>

  ${alertsSection}
  ${articlesSection}

  <section class="backpage">
    <img class="backpage-logo" src="${esc(asset(settings.logoPath)!)}" alt="" />
    <h2 class="backpage-org">${esc(settings.orgName)}</h2>
    ${settings.description ? `<p class="backpage-desc">${esc(settings.description)}</p>` : ""}
    <div class="backpage-html">${renderMarkdown(settings.backPageText)}</div>
    ${settings.contactInfo ? `<p class="backpage-contact">${esc(settings.contactInfo)}</p>` : ""}
    ${settings.socialInfo ? `<p class="backpage-social">${esc(settings.socialInfo)}</p>` : ""}
  </section>

</div>
</body>
</html>`;
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
    h1, h2, h3 { font-family: "Helvetica Neue", Arial, sans-serif; margin: 0 0 0.3em; }
    .cover {
      text-align: center;
      padding: 10mm 0 14mm;
      border-bottom: 4px solid var(--accent);
      margin-bottom: 10mm;
      page-break-after: always;
      break-after: page;
    }
    .cover-logo { max-height: 26mm; margin-bottom: 6mm; }
    .cover-org { text-transform: uppercase; letter-spacing: 0.12em; color: var(--accent-2); font-weight: 700; font-size: 12px; }
    .cover-title { font-size: 40px; color: var(--ink); margin-top: 4px; }
    .cover-range { font-size: 18px; color: var(--muted); margin-top: 4px; }
    .cover-note { font-size: 14px; margin-top: 8mm; max-width: 120mm; margin-left: auto; margin-right: auto; }
    .cover-teaser { font-size: 12px; color: var(--muted); margin-top: 8mm; font-style: italic; }

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
    .alerts { margin-bottom: 10mm; }
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

    .articles { display: flex; flex-direction: column; gap: 10mm; }
    .article {
      break-inside: avoid-page;
    }
    .article-title { font-size: 24px; }
    .article-byline { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; font-family: "Helvetica Neue", Arial, sans-serif; margin-bottom: 4mm; }
    .article-image { width: 100%; max-height: 90mm; object-fit: cover; margin-bottom: 4mm; }
    .article-body { font-size: 14px; line-height: 1.6; column-gap: 8mm; }
    .article-body p { margin: 0 0 0.8em; }
    .article-body img { max-width: 100%; }
    .article-body h1, .article-body h2, .article-body h3 { font-size: 1.1em; margin-top: 1em; }

    .backpage {
      margin-top: 14mm;
      padding-top: 10mm;
      border-top: 4px solid var(--accent);
      text-align: center;
      page-break-before: always;
      break-before: page;
    }
    .backpage-logo { max-height: 20mm; margin-bottom: 4mm; }
    .backpage-org { font-size: 18px; }
    .backpage-desc { font-size: 13px; color: var(--muted); max-width: 120mm; margin: 4mm auto; }
    .backpage-html { font-size: 12px; text-align: left; max-width: 130mm; margin: 6mm auto; line-height: 1.5; }
    .backpage-contact, .backpage-social { font-size: 11px; color: var(--muted); margin: 2px 0; }
  `;
}
