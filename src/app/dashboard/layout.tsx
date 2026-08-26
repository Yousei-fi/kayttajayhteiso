import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

const roleLabel: Record<string, string> = {
  ADMIN: "Ylläpitäjä",
  MEMBER: "Jäsen",
  SERVICE: "Palvelutili",
};

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await getCurrentUser();
  if (!user) redirect("/kirjaudu");

  const links: { href: string; label: string }[] = [{ href: "/dashboard", label: "Etusivu" }];

  if (user.role === "MEMBER" || user.role === "ADMIN") {
    links.push(
      { href: "/dashboard/artikkelit", label: "Artikkelit" },
      { href: "/dashboard/kierrokset", label: "Katukierrokset" },
    );
  }
  if (user.role === "SERVICE") {
    links.push(
      { href: "/dashboard/ilmoitukset", label: "Ilmoitukset" },
      { href: "/dashboard/kierrokset", label: "Katukierrosten havainnot" },
    );
  }
  links.push({ href: "/dashboard/viikkolehti", label: "Tuleva viikkolehti" });
  if (user.role === "ADMIN") {
    links.push({ href: "/admin", label: "Ylläpito" });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">
            {roleLabel[user.role]}
          </p>
          <p className="font-semibold">{user.serviceName || user.name}</p>
        </div>
        <nav className="flex flex-wrap gap-3 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
