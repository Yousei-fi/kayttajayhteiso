import { getSiteSettings } from "@/lib/settings";
import { renderMarkdown } from "@/lib/markdown";

export default async function TietoaPage() {
  const settings = await getSiteSettings();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={settings.logoPath} alt={settings.orgName} className="mb-6 max-h-24" />
      <h1 className="mb-2 text-2xl font-bold">{settings.orgName}</h1>
      {settings.description && <p className="mb-6 text-sm">{settings.description}</p>}
      {settings.backPageText && (
        <div className="prose-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(settings.backPageText) }} />
      )}
      {settings.contactInfo && <p className="mt-6 text-sm text-muted">{settings.contactInfo}</p>}
      {settings.socialInfo && <p className="text-sm text-muted">{settings.socialInfo}</p>}
    </main>
  );
}
