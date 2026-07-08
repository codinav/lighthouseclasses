"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, TriangleAlert } from "lucide-react";
import { sb } from "@/lib/sb";

/**
 * Landing page for Supabase email links (signup confirmation, magic links).
 * The client SDK reads the tokens from the URL automatically; we just wait
 * for the session and route into the app.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [state, setState] = useState<"working" | "ok" | "failed">("working");

  useEffect(() => {
    const client = sb();
    if (!client) {
      router.replace("/auth/login");
      return;
    }
    let settled = false;

    const { data: sub } = client.auth.onAuthStateChange((_e, session) => {
      if (session?.user && !settled) {
        settled = true;
        setState("ok");
        setTimeout(() => router.replace("/dashboard"), 1000);
      }
    });
    void client.auth.getSession().then(({ data }) => {
      if (data.session?.user && !settled) {
        settled = true;
        setState("ok");
        setTimeout(() => router.replace("/dashboard"), 1000);
      }
    });
    const timeout = setTimeout(() => {
      if (!settled) setState("failed");
    }, 8000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  if (state === "ok") {
    return (
      <div className="animate-scale-in text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
          <ShieldCheck className="h-10 w-10 text-emerald-500" aria-hidden />
        </span>
        <h1 className="mt-6 font-display text-3xl font-semibold">Email confirmed!</h1>
        <p className="mt-2 text-sm muted">You're signed in. Taking you to your dashboard…</p>
      </div>
    );
  }

  if (state === "failed") {
    return (
      <div className="animate-fade-up text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/10">
          <TriangleAlert className="h-10 w-10 text-rose-500" aria-hidden />
        </span>
        <h1 className="mt-6 font-display text-3xl font-semibold">Link expired or already used</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed muted">
          Try signing in — if your email is already confirmed it will just work. Otherwise register
          again to receive a fresh link.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/auth/login" className="btn-primary btn-md">Sign in</Link>
          <Link href="/auth/register" className="btn-ghost btn-md">Register</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up text-center">
      <Loader2 className="mx-auto h-10 w-10 animate-spin text-ocean-600" aria-hidden />
      <h1 className="mt-6 font-display text-2xl font-semibold">Signing you in…</h1>
      <p className="mt-2 text-sm muted">Confirming your email with Lighthouse Classes.</p>
    </div>
  );
}
