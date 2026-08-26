import "server-only";
import puppeteer from "puppeteer";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { STORAGE_DIR } from "@/lib/storage";

/**
 * Renders a full zine HTML document (see buildZineHtml) to an A4 PDF and
 * saves it under the uploads storage dir (served via /uploads/[...path]).
 * Page numbers are added by Chrome's own PDF footer template rather than
 * in-document CSS counters, since that is the reliable way to number pages
 * that Chrome itself paginates.
 */
export async function renderZinePdf(html: string, filename: string): Promise<string> {
  const dir = path.join(STORAGE_DIR, "zines");
  await mkdir(dir, { recursive: true });

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
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `
        <div style="font-family: Arial, sans-serif; font-size: 8px; color: #6b5f57; width: 100%; text-align: center;">
          Sivu <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>`,
      margin: { top: "18mm", bottom: "16mm", left: "15mm", right: "15mm" },
    });

    const filePath = path.join(dir, filename);
    await writeFile(filePath, pdf);
    return `/uploads/zines/${filename}`;
  } finally {
    await browser.close();
  }
}
