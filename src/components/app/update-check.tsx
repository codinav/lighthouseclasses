"use client";

/**
 * In-app update banner. Renders nothing on the website — it only activates
 * inside the Android app (Capacitor WebView), where it compares the bundled
 * APP_VERSION with /app/version.json on the live site and offers the new APK.
 */
import { useEffect, useState } from "react";
import { APP_DOWNLOAD_PAGE, APP_UPDATE_URL, APP_VERSION } from "@/lib/app-version";

function isNewer(remote: string, local: string): boolean {
  const r = remote.split(".").map((n) => parseInt(n, 10) || 0);
  const l = local.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    if ((r[i] ?? 0) !== (l[i] ?? 0)) return (r[i] ?? 0) > (l[i] ?? 0);
  }
  return false;
}

export function AppUpdateCheck() {
  const [version, setVersion] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!(window as { Capacitor?: unknown }).Capacitor) return;
    let alive = true;
    fetch(APP_UPDATE_URL, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { version?: string } | null) => {
        if (alive && j?.version && isNewer(j.version, APP_VERSION)) setVersion(j.version);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!version || dismissed) return null;
  return (
    <div className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-md rounded-2xl border border-gold-400/40 bg-navy-900 p-4 text-white shadow-lifted">
      <p className="text-sm font-semibold">Update available — v{version}</p>
      <p className="mt-0.5 text-xs text-white/70">A new version of the Lighthouse Classes app is ready.</p>
      <div className="mt-3 flex gap-2">
        <a
          href={APP_DOWNLOAD_PAGE}
          target="_blank"
          rel="noopener"
          className="rounded-full bg-gold-400 px-4 py-1.5 text-xs font-bold text-navy-900"
        >
          Download update
        </a>
        <button onClick={() => setDismissed(true)} className="rounded-full px-4 py-1.5 text-xs font-semibold text-white/70">
          Later
        </button>
      </div>
    </div>
  );
}
