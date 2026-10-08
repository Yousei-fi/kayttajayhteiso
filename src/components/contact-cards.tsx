import { qrCodeSvg } from "@/lib/qrcode";
import { MailIcon, TelegramIcon } from "@/components/icons";

/** An area's email and Telegram group, each with a QR code to scan. */
export async function ContactCards({ email, telegram }: { email: string; telegram: string }) {
  if (!email && !telegram) return null;

  const [mailQr, telegramQr] = await Promise.all([
    email ? qrCodeSvg(`mailto:${email}`) : null,
    telegram ? qrCodeSvg(telegram) : null,
  ]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {email && (
        <div className="flex flex-col items-center gap-3 rounded border border-line bg-paper p-4 text-center">
          {mailQr && <div className="h-28 w-28 shrink-0" dangerouslySetInnerHTML={{ __html: mailQr }} />}
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MailIcon className="h-4 w-4 shrink-0 text-accent-2" />
            <a href={`mailto:${email}`} className="break-words hover:underline">
              {email}
            </a>
          </div>
          <p className="text-xs text-muted">Skannaa lähettääksesi sähköpostia</p>
        </div>
      )}

      {telegram && (
        <div className="flex flex-col items-center gap-3 rounded border border-line bg-paper p-4 text-center">
          {telegramQr && <div className="h-28 w-28 shrink-0" dangerouslySetInnerHTML={{ __html: telegramQr }} />}
          <div className="flex items-center gap-2 text-sm font-semibold">
            <TelegramIcon className="h-4 w-4 shrink-0 text-accent-2" />
            <a href={telegram} target="_blank" rel="noreferrer" className="break-words hover:underline">
              {telegram}
            </a>
          </div>
          <p className="text-xs text-muted">Skannaa liittyäksesi Telegramissa</p>
        </div>
      )}
    </div>
  );
}
