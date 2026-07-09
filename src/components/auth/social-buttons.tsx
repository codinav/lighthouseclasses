"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/providers";
import { googleConfigured } from "@/lib/config";
import { isNativeApp } from "@/lib/native-app";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.02.15 3.5 2.7.24.02c2.2-2 3.5-5 3.5-8.6Z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2a7.1 7.1 0 0 1-6.7-4.9l-.14.01-3.63 2.8-.05.13A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.5a7.4 7.4 0 0 1 0-4.7l-.01-.16-3.68-2.85-.12.06a12 12 0 0 0 0 10.8l3.8-3.15Z" />
      <path fill="#EB4335" d="M12 4.6c2.3 0 3.9 1 4.8 1.9l3.5-3.4C18 1.2 15.2 0 12 0 7.3 0 3.3 2.7 1.4 6.6l3.9 3a7.1 7.1 0 0 1 6.7-5Z" />
    </svg>
  );
}

export function SocialButtons() {
  const { loginWithGoogle } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [inApp, setInApp] = useState(false);

  // Google blocks OAuth inside Android WebViews ("disallowed_useragent"),
  // so the app offers e-mail sign-in only. (Detected after mount to keep
  // server and client renders identical.)
  useEffect(() => setInApp(isNativeApp()), []);
  if (inApp) return null;

  const google = async () => {
    setError("");
    setBusy(true);
    const res = await loginWithGoogle();
    setBusy(false);
    if (res.ok) {
      router.push(params.get("next") ?? "/dashboard");
    } else if (res.error && !/closed|cancelled/i.test(res.error)) {
      setError(res.error);
    }
  };

  return (
    <div>
      <button onClick={google} disabled={busy} className="btn-ghost btn-md w-full">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <GoogleIcon />}
        Continue with Google
      </button>
      {error && (
        <p role="alert" className="mt-3 flex items-center gap-2 rounded-2xl bg-rose-500/10 px-4 py-2.5 text-xs font-medium text-rose-600 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden /> {error}
        </p>
      )}
      {!googleConfigured() && (
        <p className="mt-3 text-center text-2xs muted">
          Google sign-in is running in demo mode — add your Google Client ID in{" "}
          <code className="rounded bg-navy-900/10 px-1 py-0.5 font-mono dark:bg-white/10">src/lib/config.ts</code> to make it real.
        </p>
      )}
    </div>
  );
}

export function OrDivider() {
  const [inApp, setInApp] = useState(false);
  useEffect(() => setInApp(isNativeApp()), []);
  if (inApp) return null;
  return (
    <div className="my-6 flex items-center gap-4" role="separator">
      <span className="h-px flex-1 bg-[var(--lh-line)]" />
      <span className="text-2xs font-bold uppercase tracking-widest muted">or continue with email</span>
      <span className="h-px flex-1 bg-[var(--lh-line)]" />
    </div>
  );
}
