import { requireAreaUser } from "@/lib/auth";
import { areaUrl, isNationalAdmin } from "@/lib/area";
import { getSiteSettings } from "@/lib/settings";
import { updateAreaSettings, updateSiteSettings } from "./actions";

const input = "rounded border border-line bg-paper px-3 py-2";
const textarea = "rounded border border-line bg-paper p-3 text-sm";

export default async function AsetuksetPage() {
  const { user, area } = await requireAreaUser("ADMIN");
  const settings = await getSiteSettings();
  const national = isNationalAdmin(user);

  return (
    <div className="flex max-w-2xl flex-col gap-12">
      <section>
        <h1 className="mb-1 text-xl font-bold">{area.name}: alueen asetukset</h1>
        <p className="mb-4 text-sm text-muted">
          Näkyvät alueen etusivulla ({areaUrl(settings, area)}) ja alueen lehdessä.
        </p>

        <form action={updateAreaSettings.bind(null, area.id)} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Alueen esittely (Markdown, alueen etusivu ja lehden &quot;keitä olemme&quot; -sivu)
            <textarea name="aboutText" defaultValue={area.aboutText} rows={8} className={`${textarea} font-mono`} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Sähköposti (mailto-linkki ja QR-koodi alueen etusivulla)
            <input name="contactInfo" defaultValue={area.contactInfo} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Telegram-linkki (QR-koodi alueen etusivulla)
            <input name="socialInfo" defaultValue={area.socialInfo} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Kirjoitusehdotusten sähköposti (lehden viimeinen sivu, QR-koodi)
            <input name="submissionEmail" defaultValue={area.submissionEmail} className={input} />
          </label>
          {national && (
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="active" defaultChecked={area.active} />
              Alue on julkaistu (näkyy sivustolla)
            </label>
          )}
          <button type="submit" className="rounded bg-accent px-4 py-2 font-semibold text-white">
            Tallenna alueen asetukset
          </button>
        </form>
      </section>

      {national && (
        <section>
          <h2 className="mb-1 text-xl font-bold">Koko sivuston asetukset</h2>
          <p className="mb-4 text-sm text-muted">
            Yhteiset kaikille alueille. Vaihda logo lisäämällä tiedosto kansioon <code>public/branding/</code> ja
            kirjoittamalla sen polku alle.
          </p>

          <form action={updateSiteSettings} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Yhteisön nimi
              <input name="orgName" defaultValue={settings.orgName} className={input} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Logon polku
              <input name="logoPath" defaultValue={settings.logoPath} className={input} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Lyhyt kuvaus (etusivu)
              <textarea name="description" defaultValue={settings.description} rows={3} className={textarea} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Tietoa meistä -sivun teksti (Markdown, /tietoa; myös lehteen, jos alueella ei ole omaa esittelyä)
              <textarea name="aboutText" defaultValue={settings.aboutText} rows={8} className={`${textarea} font-mono`} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Lisäteksti (Markdown, esim. toistuva haittojen vähentämisen tieto — näkyy /tietoa-sivulla)
              <textarea name="backPageText" defaultValue={settings.backPageText} rows={8} className={`${textarea} font-mono`} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Sivuston julkinen osoite (alueen osoite on tämä + /alue; lehden QR-koodit)
              <input name="publicSiteUrl" defaultValue={settings.publicSiteUrl} className={input} />
            </label>
            <button type="submit" className="rounded bg-accent px-4 py-2 font-semibold text-white">
              Tallenna sivuston asetukset
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
