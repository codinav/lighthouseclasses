#!/bin/bash
# Builds the static-export version of Lighthouse Classes and packages it as
# a zip ready to upload on Hostinger (extract into public_html).
#
# Hostinger's upload wizard rejects anything that looks like a framework
# project ("Unsupported framework or invalid project structure") — including
# static exports containing a `_next` folder. So after exporting we rename
# `_next` → `assets` and rewrite every reference, leaving a plain static site.
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

echo "→ Building…"
rm -rf out
STATIC_EXPORT=1 npx next build

echo "→ De-framework-ing: renaming _next → assets and rewriting references…"
mv out/_next out/assets
# Rewrite /_next/ → /assets/ in every text asset (HTML, JS, CSS, RSC payloads).
# perl -pi is used instead of `sed -i` so this works identically on macOS (BSD
# sed) and Linux/CI (GNU sed), whose in-place flags are incompatible.
LC_ALL=C find out -type f \( -name "*.html" -o -name "*.js" -o -name "*.css" -o -name "*.txt" \) \
  -exec perl -pi -e 's{/_next/}{/assets/}g' {} +

# One-time shim (2026-07-09): the server's FTP sync-state still lists the old
# build-id folders (assets/{id} and assets/static/{id}), but they're gone from the
# server. FTP-Deploy-Action tolerates missing *files* on delete but crashes (550)
# removing a missing *folder*. Shipping placeholders keeps both off the deletion
# list; the run then completes and writes a fresh sync-state. Safe to remove after
# one green deploy.
for GHOST in out/assets/Pl8ovB1Hmv0eA6f30_-5c out/assets/static/Pl8ovB1Hmv0eA6f30_-5c; do
  mkdir -p "$GHOST"
  printf 'placeholder — see build-hostinger.sh\n' > "$GHOST/keep.txt"
done

echo "→ Adding .htaccess for Apache/LiteSpeed…"
cat > out/.htaccess <<'HTACCESS'
Options -Indexes
ErrorDocument 404 /404.html

<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
  <FilesMatch "\.(js|css|woff2)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>

AddType application/manifest+json .webmanifest
AddType image/svg+xml .svg
AddType video/mp4 .mp4
AddType application/vnd.android.package-archive .apk
AddType video/webm .webm
HTACCESS

echo "→ Adding Hostinger video-upload script (api/upload.php) + raised PHP limits…"
# Keep the upload script's token in sync with src/lib/config.ts automatically.
TOKEN=$(grep -A2 'HOSTINGER_UPLOAD_TOKEN =' src/lib/config.ts | grep -oE '"[^"]+"' | tail -1 | tr -d '"')
if [ -z "$TOKEN" ]; then echo "  ! Could not read HOSTINGER_UPLOAD_TOKEN from config.ts"; exit 1; fi
mkdir -p out/api out/videos
sed "s|__UPLOAD_TOKEN__|${TOKEN}|g" hostinger-extras/api/upload.php > out/api/upload.php
cp hostinger-extras/api/.user.ini out/api/.user.ini
cp hostinger-extras/.user.ini out/.user.ini
# Guarantee the (initially empty) videos folder ships inside the zip.
printf '<!doctype html><title>Videos</title>\n' > out/videos/index.html

echo "→ Zipping…"
ZIP="lighthouse-classes-hostinger.zip"
rm -f "$ZIP"
(cd out && zip -qr "../$ZIP" . -x "*.DS_Store")
# Copy to Desktop for the manual-upload workflow (skipped in CI, where it's absent).
[ -d "$HOME/Desktop" ] && cp -f "$ZIP" "$HOME/Desktop/$ZIP"

echo "✓ Done: $ZIP ($(du -h "$ZIP" | cut -f1 | xargs)); static site in ./out"
echo "  Hostinger → File Manager → public_html → upload zip → Extract."
echo "  Device video uploads store into public_html/videos via api/upload.php."
