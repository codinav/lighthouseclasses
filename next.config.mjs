/**
 * Two build modes:
 *  - default: Node server build (middleware + API routes) — `npm run build`
 *  - STATIC_EXPORT=1: static export for Apache/LiteSpeed hosts like Hostinger
 *    (`npm run build:hostinger`). trailingSlash makes every route a folder
 *    with index.html so URLs work without server rewrites.
 */
const isStaticExport = process.env.STATIC_EXPORT === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(isStaticExport
    ? {
        output: "export",
        trailingSlash: true,
      }
    : {
        async headers() {
          return [
            {
              source: "/(.*)",
              headers: [
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "X-Frame-Options", value: "DENY" },
                { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
              ],
            },
          ];
        },
      }),
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
