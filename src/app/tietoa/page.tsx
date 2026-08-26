import { getSiteSettings } from "@/lib/settings";
import { renderMarkdown } from "@/lib/markdown";
import { qrCodeSvg } from "@/lib/qrcode";
import { MailIcon, TelegramIcon } from "@/components/icons";

export default async function TietoaPage() {
  const settings = await getSiteSettings();

  const [mailQr, telegramQr] = await Promise.all([
    settings.contactInfo ? qrCodeSvg(`mailto:${settings.contactInfo}`) : null,
    settings.socialInfo ? qrCodeSvg(settings.socialInfo) : null,
  ]);

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

      {(settings.contactInfo || settings.socialInfo) && (
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {settings.contactInfo && (
            <div className="flex flex-col items-center gap-3 rounded border border-line bg-paper p-4 text-center">
              {mailQr && <div className="h-28 w-28 shrink-0" dangerouslySetInnerHTML={{ __html: mailQr }} />}
              <div className="flex items-center gap-2 text-sm font-semibold">
                <MailIcon className="h-4 w-4 shrink-0 text-accent-2" />
                <a href={`mailto:${settings.contactInfo}`} className="break-words hover:underline">
                  {settings.contactInfo}
                </a>
              </div>
              <p className="text-xs text-muted">Skannaa lähettääksesi sähköpostia</p>
            </div>
          )}

          {settings.socialInfo && (
            <div className="flex flex-col items-center gap-3 rounded border border-line bg-paper p-4 text-center">
              {telegramQr && <div className="h-28 w-28 shrink-0" dangerouslySetInnerHTML={{ __html: telegramQr }} />}
              <div className="flex items-center gap-2 text-sm font-semibold">
                <TelegramIcon className="h-4 w-4 shrink-0 text-accent-2" />
                <a href={settings.socialInfo} target="_blank" rel="noreferrer" className="break-words hover:underline">
                  {settings.socialInfo}
                </a>
              </div>
              <p className="text-xs text-muted">Skannaa liittyäksesi Telegramissa</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
