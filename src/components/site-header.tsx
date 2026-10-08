import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { areaPath, getActiveAreas } from "@/lib/area";
import { getSiteSettings } from "@/lib/settings";
import { logoutAction } from "@/app/kirjaudu/actions";

/**
 * The national header, on every page. An area's own sections (palvelut,
 * NA-ryhmät, lehti...) are in the bar under it, from app/[area]/layout.tsx.
 */
export async function SiteHeader() {
  const [user, areas, settings] = await Promise.all([getCurrentUser(), getActiveAreas(), getSiteSettings()]);

  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap text-lg font-bold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={settings.logoPath} alt="" className="h-8 w-8 rounded object-cover" />
          {settings.orgName}
          <span className="rounded bg-yellow-300 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-black">
            BETA
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/tietoa" className="hover:underline">
            Tietoa
          </Link>
          <Link href="/artikkelit" className="hover:underline">
            Artikkelit
          </Link>
          {areas.map((area) => (
            <Link key={area.id} href={areaPath(area)} className="font-semibold hover:underline">
              {area.name}
            </Link>
          ))}
          {user ? (
            <>
              <Link href="/dashboard" className="font-semibold hover:underline">
                Oma sivu
              </Link>
              <form action={logoutAction}>
                <button type="submit" className="text-muted hover:underline">
                  Kirjaudu ulos
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/kirjaudu"
              className="rounded bg-accent px-3 py-1.5 font-semibold text-white"
            >
              Kirjaudu
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
