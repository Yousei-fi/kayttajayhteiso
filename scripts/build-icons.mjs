/**
 * Builds the site's browser icons from the Käyttäjäyhteisö soundwave mark:
 *
 *   src/app/icon.svg        modern browsers' tab icon
 *   src/app/favicon.ico     16/32/48 px for everything else
 *   src/app/apple-icon.png  180 px home-screen icon, on white
 *
 *   node scripts/build-icons.mjs
 *
 * The mark is redrawn as vectors rather than cut out of
 * public/branding/kayttajayhteiso.jpg: nine rounded bars with one vertical
 * gradient, measured off that file (bar centres, ends and the gradient's
 * end colours are in the logo's own 1080 px coordinates below). A crop of
 * the JPEG went muddy on dark tab bars and its 23 px bars all but vanished
 * at 16 px, so the small sizes here draw the bars thicker than the logo
 * does.
 */
import { writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/app");

// [centre x, top y, bottom y] of each bar in the logo.
const BARS = [
  [312, 327, 428],
  [368, 301, 455],
  [423, 230, 526],
  [479, 269, 486],
  [535, 206, 549],
  [591, 269, 486],
  [646, 230, 526],
  [702, 301, 455],
  [758, 327, 428],
];
const TOP_COLOR = "#f90dff";
const BOTTOM_COLOR = "#2ab7e4";

/** The mark as SVG on a square canvas. `barWidth` 23 is the logo's own. */
function markSvg({ barWidth, padding, background }) {
  const minX = BARS[0][0] - barWidth / 2;
  const maxX = BARS.at(-1)[0] + barWidth / 2;
  const side = maxX - minX + 2 * padding;
  const cy = (206 + 549) / 2;
  const x0 = minX - padding;
  const y0 = cy - side / 2;
  const bars = BARS.map(([cx, top, bottom]) => {
    const r = barWidth / 2;
    return `<rect x="${cx - r}" y="${top}" width="${barWidth}" height="${bottom - top}" rx="${r}"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${side} ${side}">
<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="206" x2="0" y2="549"><stop offset="0" stop-color="${TOP_COLOR}"/><stop offset="1" stop-color="${BOTTOM_COLOR}"/></linearGradient></defs>
${background ? `<rect x="${x0}" y="${y0}" width="${side}" height="${side}" fill="${background}"/>` : ""}<g fill="url(#g)">${bars}</g>
</svg>
`;
}

/** Packs PNGs into one .ico (PNG-in-ICO, supported everywhere current). */
function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();

async function render(svg, size) {
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`,
  );
  return Buffer.from(await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } }));
}

try {
  writeFileSync(path.join(APP, "icon.svg"), markSvg({ barWidth: 30, padding: 6 }));

  // Thicker still at 16-48 px, where a hairline bar disappears.
  const small = markSvg({ barWidth: 36, padding: 2 });
  const pngs = [];
  for (const size of [16, 32, 48]) pngs.push({ size, data: await render(small, size) });
  writeFileSync(path.join(APP, "favicon.ico"), ico(pngs));

  // iOS draws transparency as black, so the home-screen icon gets white.
  const apple = markSvg({ barWidth: 26, padding: 70, background: "#ffffff" });
  writeFileSync(path.join(APP, "apple-icon.png"), await render(apple, 180));

  console.log("Wrote src/app/icon.svg, favicon.ico (16/32/48) and apple-icon.png (180).");
} finally {
  await browser.close();
}
