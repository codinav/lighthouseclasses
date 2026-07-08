"use client";

import Link from "next/link";
import { useState } from "react";
import { KeyRound, Loader2, MailCheck } from "lucide-react";
import { sb } from "@/lib/sb";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const client = sb();
    if (client) {
      // Real reset email via Supabase Auth (always report success — no
      // account enumeration). The link lands on /auth/reset.
      await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      });
    } else {
      await new Promise((r) => setTimeout(r, 900));
    }
    setBusy(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="animate-scale-in text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
          <MailCheck className="h-10 w-10 text-emerald-500" aria-hidden />
        </span>
        <h1 className="mt-6 font-display text-3xl font-semibold">Reset link sent</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed muted">
          If an account exists for <strong className="text-[var(--lh-ink)]">{email}</strong>, you'll
          receive a password reset link within a few minutes. Check your spam folder too.
        </p>
        <Link href="/auth/login" className="btn-primary btn-md mt-8">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ocean-600/10">
        <KeyRound className="h-7 w-7 text-ocean-600" aria-hidden />
      </span>
      <h1 className="mt-6 font-display text-3xl font-semibold">Forgot your password?</h1>
      <p className="mt-2 text-sm leading-relaxed muted">
        No judgement — it happens to the best of us. Enter your email and we'll send you a secure
        reset link.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="label-lh">Email address</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input-lh"
          />
        </div>
        <button type="submit" disabled={busy || !email} className="btn-primary btn-lg w-full">
          {busy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
          {busy ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm muted">
        Remembered it?{" "}
        <Link href="/auth/login" className="font-semibold text-ocean-600 hover:underline dark:text-gold-400">
          Sign in
        </Link>
      </p>
    </div>
  );
}
