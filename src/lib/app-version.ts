/**
 * Version of the Android app (single source of truth).
 *
 * scripts/build-apk.sh reads this and stamps android/app/build.gradle
 * (versionName + a derived versionCode) and public/app/version.json before
 * building. Bump it here for every APK release.
 */
export const APP_VERSION = "1.0.1";

/** Where the app checks for updates. www bypasses the in-app local server,
 * which hijacks the bare-domain origin to serve bundled assets. */
export const APP_UPDATE_URL = "https://www.lighthouseclasses.com/app/version.json";

/** The public download page (opened in the system browser from the app). */
export const APP_DOWNLOAD_PAGE = "https://www.lighthouseclasses.com/app/";
