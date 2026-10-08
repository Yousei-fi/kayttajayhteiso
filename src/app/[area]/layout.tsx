import type { Metadata } from "next";
import Link from "next/link";
import { areaOrgName, areaPath, requireArea } from "@/lib/area";
import { ZINE_NAME } from "@/lib/zine-brand";

export async function generateMetadata({ params }: LayoutProps<"/[area]">): Promise<Metadata> {
  const area = await requireArea((await params).area);
  return {
    // absolute: the area name replaces the national one rather than nesting in it.
    title: { absolute: areaOrgName(area), template: `%s · ${areaOrgName(area)}` },
    description: `${area.nameGenitive} palvelut, NA-ryhmät, tapahtumat ja ${ZINE_NAME} -lehti.`,
  };
}

/**
 * Everything about one place lives under /<area>. This layout resolves the
 * slug (404 for an unknown or not-yet-launched area) and adds the area's own
 * navigation under the national header.
 */
export default async function AreaLayout({ children, params }: LayoutProps<"/[area]">) {
  const area = await requireArea((await params).area);

  const links = [
    { href: areaPath(area, "/palvelut"), label: "Palvelut" },
    { href: areaPath(area, "/na-ryhmat"), label: "NA-ryhmät" },
    { href: areaPath(area, "/tapahtumat"), label: "Tapahtumat" },
    { href: areaPath(area, "/ilmoitukset"), label: "Ilmoitukset" },
    { href: areaPath(area, "/lehti"), label: ZINE_NAME },
  ];

  return (
    <>
      <div className="border-b border-line bg-accent/5">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 text-sm">
          <Link href={areaPath(area)} className="font-bold text-accent">
            {area.name}
          </Link>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:underline">
              {l.label}
            </Link>
          ))}
        </div>
      </div>
      {children}
    </>
  );
}
