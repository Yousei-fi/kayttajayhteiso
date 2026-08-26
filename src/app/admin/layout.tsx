import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await getCurrentUser();
  if (!user) redirect("/kirjaudu");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
        <p className="text-xs uppercase tracking-wide text-accent">Ylläpito</p>
        <nav className="flex flex-wrap gap-3 text-sm">
          <Link href="/admin" className="hover:underline">Etusivu</Link>
          <Link href="/admin/viikkolehti" className="hover:underline">Viikkolehdet</Link>
          <Link href="/admin/kayttajat" className="hover:underline">Käyttäjät</Link>
          <Link href="/admin/asetukset" className="hover:underline">Asetukset</Link>
          <Link href="/dashboard" className="hover:underline">Takaisin omalle sivulle</Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
