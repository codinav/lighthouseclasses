/**
 * Detects the Android app (Capacitor WebView). The app appends this token to
 * its user agent (see capacitor.config.ts) so both inline scripts and React
 * can adapt — e.g. hiding Google sign-in, which Google blocks in WebViews.
 */
export const NATIVE_APP_UA = "LighthouseClassesApp";

export const isNativeApp = () =>
  typeof navigator !== "undefined" && navigator.userAgent.includes(NATIVE_APP_UA);
