#!/bin/bash
# Packages the project SOURCE for Hostinger's "Upload your app files" wizard:
# package.json at zip root, static-export config baked in, server-only parts
# (middleware, API routes) excluded. Output: ~/Desktop/lighthouse-classes-app-source.zip
set -euo pipefail
cd "$(dirname "$0")/.."

STAGE="$(mktemp -d)/lighthouse-classes"
mkdir -p "$STAGE/src"

cp package.json package-lock.json tsconfig.json tailwind.config.ts postcss.config.mjs "$STAGE/"
cp -R public "$STAGE/public"
cp -R src/lib src/components "$STAGE/src/"
cp -R src/app "$STAGE/src/app"
rm -rf "$STAGE/src/app/api"

cat > "$STAGE/next.config.mjs" <<'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
};
export default nextConfig;
EOF

node -e "
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('$STAGE/package.json', 'utf8'));
p.scripts = { dev: 'next dev', build: 'next build', start: 'npx serve out' };
fs.writeFileSync('$STAGE/package.json', JSON.stringify(p, null, 2));
"

ZIP="$HOME/Desktop/lighthouse-classes-app-source.zip"
rm -f "$ZIP"
(cd "$STAGE" && zip -qr "$ZIP" . -x "*.DS_Store")
rm -rf "$(dirname "$STAGE")"
echo "✓ Done: $ZIP ($(du -h "$ZIP" | cut -f1 | xargs))"
