"use client";

import { useEffect } from "react";
import { AREA_COOKIE } from "@/lib/area-slugs";

/** Remembers the area page being viewed; see AREA_COOKIE for why it is set here. */
export function RememberArea({ slug }: { slug: string }) {
  useEffect(() => {
    document.cookie = `${AREA_COOKIE}=${slug}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, [slug]);
  return null;
}
