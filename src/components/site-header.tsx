import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/kirjaudu/actions";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold">
          Tampereen Käyttäjäyhteisö
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/viikkolehti" className="hover:underline">
            Viikkolehti
          </Link>
          <Link href="/artikkelit" className="hover:underline">
            Artikkelit
          </Link>
          <Link href="/ilmoitukset" className="hover:underline">
            Ilmoitukset
          </Link>
          <Link href="/tietoa" className="hover:underline">
            Tietoa
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
