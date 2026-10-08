import Link from "next/link";
import { getSiteSettings } from "@/lib/settings";
import { areaPath, getActiveAreas } from "@/lib/area";
import { renderMarkdown } from "@/lib/markdown";
import { MailIcon } from "@/components/icons";

/**
 * About the national community. Each area's own contact details, with QR
 * codes, are on its front page; this lists where to find them.
 */
export default async function TietoaPage() {
  const [settings, areas] = await Promise.all([getSiteSettings(), getActiveAreas()]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={settings.logoPath} alt={settings.orgName} className="mb-6 max-h-24" />
      <h1 className="mb-4 text-2xl font-bold">{settings.orgName}</h1>

      {settings.aboutText && (
        <div className="prose-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(settings.aboutText) }} />
      )}

      {settings.backPageText && (
        <div
          className="prose-content mt-6"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(settings.backPageText) }}
        />
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold">Alueet</h2>
        <ul className="flex flex-col gap-2">
          {areas.map((area) => (
            <li key={area.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-line bg-paper p-3">
              <Link href={areaPath(area)} className="font-semibold hover:underline">
                {area.name}
              </Link>
              {area.contactInfo && (
                <a href={`mailto:${area.contactInfo}`} className="flex items-center gap-2 text-sm hover:underline">
                  <MailIcon className="h-4 w-4 shrink-0 text-accent-2" />
                  {area.contactInfo}
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
