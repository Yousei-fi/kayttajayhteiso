import { ZINE_NAME } from "@/lib/zine-brand";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/kirjaudu/actions";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap text-lg font-bold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/logo.jpeg" alt="" className="h-8 w-8 rounded object-cover" />
          Tampereen Käyttäjäyhteisö
          <span className="rounded bg-yellow-300 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-black">
            BETA
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/tietoa" className="hover:underline">
            Tietoa
          </Link>
          <Link href="/ilmoitukset" className="hover:underline">
            Ilmoitukset
          </Link>
          <Link href="/artikkelit" className="hover:underline">
            Artikkelit
          </Link>
          <Link href="/lehti" className="hover:underline">
            {ZINE_NAME}
          </Link>
          <Link href="/tapahtumat" className="hover:underline">
            Tapahtumat
          </Link>
          <Link href="/palvelut" className="hover:underline">
            Tampereen palvelut
          </Link>
          <Link href="/na-ryhmat" className="hover:underline">
            Tampereen NA-ryhmät
          </Link>
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
