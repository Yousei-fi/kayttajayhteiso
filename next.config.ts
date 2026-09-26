import type { NextConfig } from "next";

const NEW_ORIGIN = "https://tampere.kayttajayhteiso.fi";

const nextConfig: NextConfig = {
  /**
   * Send the retired kuntoutus.info host to the community's own domain,
   * preserving the path. Back issues of the paper are printed with QR codes
   * pointing at the old address and cannot be reissued, so those codes have
   * to keep resolving for as long as the domain does.
   *
   * This only fires for a request that actually arrives carrying the old
   * Host header, so it costs nothing if the domain is never pointed here.
   * For it to reach the app at all, kuntoutus.info must also be attached to
   * the "app" service in Coolify alongside the primary domain.
   */
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "(?:www\\.)?kuntoutus\\.info" }],
        destination: `${NEW_ORIGIN}/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
