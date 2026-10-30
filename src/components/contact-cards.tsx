import { qrCodeSvg } from "@/lib/qrcode";
import { MailIcon } from "@/components/icons";

/** An area's email address, with a QR code to scan. */
export async function ContactCards({ email }: { email: string }) {
  if (!email) return null;
  const mailQr = await qrCodeSvg(`mailto:${email}`);

  return (
    <div className="flex flex-col items-center gap-3 rounded border border-line bg-paper p-4 text-center sm:max-w-sm">
      {mailQr && <div className="h-28 w-28 shrink-0" dangerouslySetInnerHTML={{ __html: mailQr }} />}
      <div className="flex items-center gap-2 text-sm font-semibold">
        <MailIcon className="h-4 w-4 shrink-0 text-accent-2" />
        <a href={`mailto:${email}`} className="break-words hover:underline">
          {email}
        </a>
      </div>
      <p className="text-xs text-muted">Skannaa lähettääksesi sähköpostia</p>
    </div>
  );
}
