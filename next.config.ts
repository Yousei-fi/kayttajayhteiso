import type { NextConfig } from "next";

const NEW_ORIGIN = "https://kayttajayhteiso.fi";

/**
 * Both addresses the Tampere site has had: kuntoutus.info, then
 * tampere.kayttajayhteiso.fi. Back issues of the paper are printed with QR
 * codes pointing at each of them (at the bare root) and cannot be reissued,
 * so every path on them has to keep resolving for as long as the domains do.
 */
const OLD_TAMPERE_HOSTS = [{ type: "host" as const, value: "(?:www\\.)?kuntoutus\\.info|tampere\\.kayttajayhteiso\\.fi" }];

const nextConfig: NextConfig = {
  /**
   * Send the old Tampere hosts into the national site in one hop, mapping
   * each path to where it lives now. National pages (articles, login, the
   * dashboard, uploaded files) keep their path; everything that was about
   * Tampere moves under /tampere — including the bare root, which is what
   * the printed QR codes point at.
   *
   * These only fire for a request that actually arrives carrying an old Host
   * header, so they cost nothing until the domains are attached to this
   * app's service in Coolify alongside kayttajayhteiso.fi. Rules are matched
   * in order; the catch-all is last.
   */
  async redirects() {
    const keepPath = ["/artikkelit/:path*", "/kirjaudu", "/dashboard/:path*", "/admin/:path*", "/uploads/:path*"];
    return [
      ...keepPath.map((source) => ({
        source,
        has: OLD_TAMPERE_HOSTS,
        destination: `${NEW_ORIGIN}${source}`,
        permanent: true,
      })),
      // Tampere's about page carried its contact details, now on /tampere.
      { source: "/tietoa", has: OLD_TAMPERE_HOSTS, destination: `${NEW_ORIGIN}/tampere`, permanent: true },
      { source: "/", has: OLD_TAMPERE_HOSTS, destination: `${NEW_ORIGIN}/tampere`, permanent: true },
      { source: "/:path*", has: OLD_TAMPERE_HOSTS, destination: `${NEW_ORIGIN}/tampere/:path*`, permanent: true },
    ];
  },
};

export default nextConfig;
