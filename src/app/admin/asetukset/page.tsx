import { requireUser } from "@/lib/auth";
import { getSiteSettings } from "@/lib/settings";
import { updateSiteSettings } from "./actions";

export default async function AsetuksetPage() {
  await requireUser("ADMIN");
  const settings = await getSiteSettings();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-xl font-bold">Asetukset ja brändäys</h1>
      <p className="mb-4 text-sm text-muted">
        Nämä tiedot näkyvät julkisella sivustolla ja viikkolehden takasivulla. Vaihda logo lisäämällä
        tiedosto kansioon <code>public/branding/</code> ja kirjoittamalla sen polku alle.
      </p>

      <form action={updateSiteSettings} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Yhteisön nimi
          <input name="orgName" defaultValue={settings.orgName} className="rounded border border-line bg-paper px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Logon polku
          <input name="logoPath" defaultValue={settings.logoPath} className="rounded border border-line bg-paper px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Lyhyt kuvaus (etusivu &amp; lehden takasivu)
          <textarea name="description" defaultValue={settings.description} rows={3} className="rounded border border-line bg-paper p-3 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Tietoa meistä -sivun teksti (Markdown, /tietoa)
          <textarea name="aboutText" defaultValue={settings.aboutText} rows={8} className="rounded border border-line bg-paper p-3 font-mono text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Sähköposti (mailto-linkki ja QR-koodi /tietoa-sivulla)
          <input name="contactInfo" defaultValue={settings.contactInfo} className="rounded border border-line bg-paper px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Telegram-linkki (QR-koodi /tietoa-sivulla)
          <input name="socialInfo" defaultValue={settings.socialInfo} className="rounded border border-line bg-paper px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Takasivun teksti (Markdown, esim. toistuva haittojen vähentämisen tieto, QR-koodin selite)
          <textarea name="backPageText" defaultValue={settings.backPageText} rows={8} className="rounded border border-line bg-paper p-3 font-mono text-sm" />
        </label>

        <button type="submit" className="rounded bg-accent px-4 py-2 font-semibold text-white">
          Tallenna
        </button>
      </form>
    </div>
  );
}
