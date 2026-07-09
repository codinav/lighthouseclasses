import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Android app shell (see scripts/build-app.sh).
 *
 * The WebView serves the bundled static export (out/) under the site's real
 * origin, https://lighthouseclasses.com — so Supabase auth/storage behave like
 * the website, absolute media URLs (videos, upload.php) hit the real server,
 * and auth e-mails generated from window.location.origin link to the website.
 */
const config: CapacitorConfig = {
  appId: "com.lighthouseclasses.app",
  appName: "Lighthouse Classes",
  webDir: "out",
  server: {
    androidScheme: "https",
    hostname: "lighthouseclasses.com",
  },
  android: {
    allowMixedContent: false,
    // Lets the site detect the app (see src/lib/native-app.ts)
    appendUserAgent: "LighthouseClassesApp",
  },
  plugins: {
    // The site chrome is light (paper-cream); don't follow the system theme.
    SystemBars: {
      style: "LIGHT",
    },
  },
};

export default config;
