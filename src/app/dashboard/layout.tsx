import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAllAreas, getWorkingArea, isNationalAdmin } from "@/lib/area";
import { AreaSwitcher } from "@/components/area-switcher";

const roleLabel: Record<string, string> = {
  ADMIN: "Ylläpitäjä",
  MEMBER: "Jäsen",
  SERVICE: "Palvelutili",
};

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await getCurrentUser();
  if (!user) redirect("/kirjaudu");
  const area = await getWorkingArea(user);

  const links: { href: string; label: string }[] = [{ href: "/dashboard", label: "Etusivu" }];

  if (user.role === "MEMBER" || user.role === "ADMIN") {
    links.push({ href: "/dashboard/artikkelit", label: "Artikkelit" });
    if (area) {
      links.push(
        { href: "/dashboard/tapahtumat", label: "Tapahtumat" },
        { href: "/dashboard/kierrokset", label: "Katukierrokset" },
      );
    }
  }
  if (user.role === "SERVICE" && area) {
    links.push(
      { href: "/dashboard/ilmoitukset", label: "Ilmoitukset" },
      { href: "/dashboard/kierrokset", label: "Katukierrosten havainnot" },
    );
  }
  if (area) links.push({ href: "/dashboard/lehti", label: "Tuleva lehti" });
  if (user.role === "ADMIN") {
    links.push({ href: "/admin", label: "Ylläpito" });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">
            {roleLabel[user.role]}
            {isNationalAdmin(user) ? " · valtakunnallinen" : area ? ` · ${area.name}` : ""}
          </p>
          <p className="font-semibold">{user.serviceName || user.name}</p>
          {isNationalAdmin(user) && area && <AreaSwitcher areas={await getAllAreas()} current={area.id} />}
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
