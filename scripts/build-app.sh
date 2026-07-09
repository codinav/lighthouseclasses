#!/bin/bash
# Builds the static export used as the Android app's bundled web assets (out/),
# then syncs it into the Capacitor android project. Unlike build-hostinger.sh
# this keeps the plain Next output (no _next→assets rename, no PHP extras) —
# the app WebView doesn't have Hostinger's restrictions.
#
# Requires JDK + Android SDK only for the subsequent APK build (see
# scripts/build-apk.sh); this script itself just needs node.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Preparing static-export build (middleware & API routes excluded)…"
STASH=".export-stash"
mkdir -p "$STASH"
restore() {
  [ -e "$STASH/middleware.ts" ] && mv "$STASH/middleware.ts" src/middleware.ts
  [ -e "$STASH/api" ] && mv "$STASH/api" src/app/api
  rmdir "$STASH" 2>/dev/null || true
}
trap restore EXIT
[ -e src/middleware.ts ] && mv src/middleware.ts "$STASH/middleware.ts"
[ -e src/app/api ] && mv src/app/api "$STASH/api"

echo "→ Building static export…"
rm -rf out
STATIC_EXPORT=1 npx next build

# The APK must not ship inside its own web bundle (15MB of recursion).
rm -f out/app/lighthouse-classes.apk

echo "→ Syncing into the Capacitor Android project…"
npx cap sync android

echo "✓ App web assets ready (out/ → android/app/src/main/assets/public)"
