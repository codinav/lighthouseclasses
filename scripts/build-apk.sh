#!/bin/bash
# Releases a new version of the Android app, end to end:
#   1. reads APP_VERSION from src/lib/app-version.ts (bump it there first)
#   2. stamps android/app/build.gradle (versionName + derived versionCode)
#   3. rebuilds the web bundle (scripts/build-app.sh) and the signed APK
#   4. copies it to public/app/lighthouse-classes.apk + updates version.json
# Then commit + push: the site deploy publishes the new APK, and installed
# apps offer the update via the in-app banner.
#
# Requires: JDK 21 + Android SDK (see ~/androidbuild and ~/Library/Android/sdk)
# and the signing keystore (~/.lighthouse-android — BACK IT UP).
set -euo pipefail
cd "$(dirname "$0")/.."

export JAVA_HOME="${JAVA_HOME:-$HOME/androidbuild/jdk-21.0.11+10/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"

VERSION=$(grep -oE 'APP_VERSION = "[0-9.]+"' src/lib/app-version.ts | grep -oE '[0-9.]+')
[ -z "$VERSION" ] && { echo "! Could not read APP_VERSION from src/lib/app-version.ts"; exit 1; }
IFS=. read -r MAJ MIN PAT <<< "$VERSION"
CODE=$((MAJ * 10000 + MIN * 100 + ${PAT:-0}))
echo "→ Releasing v$VERSION (versionCode $CODE)…"

perl -pi -e "s/versionCode \\d+/versionCode $CODE/; s/versionName \"[^\"]*\"/versionName \"$VERSION\"/" android/app/build.gradle

bash scripts/build-app.sh

echo "→ Building signed release APK…"
(cd android && ./gradlew assembleRelease -q)

APK=android/app/build/outputs/apk/release/app-release.apk
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify "$APK"

mkdir -p public/app
cp "$APK" public/app/lighthouse-classes.apk
SIZE=$(du -m public/app/lighthouse-classes.apk | cut -f1)
printf '{\n  "version": "%s",\n  "apk": "/app/lighthouse-classes.apk",\n  "sizeMB": %s,\n  "released": "%s"\n}\n' \
  "$VERSION" "$SIZE" "$(date -u +%Y-%m-%d)" > public/app/version.json

echo "✓ v$VERSION APK at public/app/lighthouse-classes.apk (${SIZE} MB)."
echo "  Commit public/app/* + android/app/build.gradle, push, and the deploy publishes it."
