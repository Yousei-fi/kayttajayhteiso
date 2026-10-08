import { NextResponse, type NextRequest } from "next/server";
import {
  AREA_ALIASES,
  AREA_COOKIE,
  AREA_SECTIONS,
  DEFAULT_AREA_SLUG,
  isAreaSlug,
} from "@/lib/area-slugs";

/**
 * Two jobs, both about which area a request belongs to:
 *
 * - /pks/... is the short form printed on paper; send it to the full slug.
 * - A root-level path from before areas (/palvelut, /lehti/arkisto) goes to
 *   the same section of the visitor's remembered area, or Tampere's, since
 *   every such link in the wild was Tampere's.
 *
 * Unknown or inactive slugs are left to the [area] layout, which 404s.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const [first, ...rest] = pathname.split("/").filter(Boolean);
  const tail = rest.length > 0 ? `/${rest.join("/")}` : "";

  const alias = first ? AREA_ALIASES[first] : undefined;
  if (alias) {
    return NextResponse.redirect(new URL(`/${alias}${tail}${search}`, request.url), 308);
  }

  if (first && (AREA_SECTIONS as readonly string[]).includes(first)) {
    const remembered = request.cookies.get(AREA_COOKIE)?.value;
    const area = isAreaSlug(remembered) ? remembered : DEFAULT_AREA_SLUG;
    // Temporary: the target depends on the visitor's cookie.
    return NextResponse.redirect(new URL(`/${area}${pathname}${search}`, request.url), 307);
  }

  return NextResponse.next();
}

export const config = {
  // Pages only: not static assets, uploads or Next's own files.
  matcher: ["/((?!_next/|uploads/|branding/|favicon\\.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
