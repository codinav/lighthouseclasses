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
        // Constant build id: assets/static/<id> keeps the same name every
        // deploy, so the FTP sync never schedules a folder deletion — the
        // Hostinger server prunes emptied folders faster than the sync can
        // RMD them, which crashed deploys. Chunks stay content-hashed, so
        // caching is unaffected; the manifests get a no-cache .htaccess rule.
        generateBuildId: async () => "lh",
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
