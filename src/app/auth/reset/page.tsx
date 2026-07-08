"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck, TriangleAlert } from "lucide-react";
import { sb } from "@/lib/sb";

/** Arrival point for password-recovery emails: set a new password. */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState<"checking" | "form" | "invalid" | "done">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const client = sb();
    if (!client) {
      setReady("invalid");
      return;
    }
    let settled = false;
    const { data: sub } = client.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || session?.user) && !settled) {
        settled = true;
        setReady("form");
      }
    });
    void client.auth.getSession().then(({ data }) => {
      if (data.session?.user && !settled) {
        settled = true;
        setReady("form");
      }
    });
    const timeout = setTimeout(() => {
      if (!settled) setReady("invalid");
    }, 8000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setBusy(true);
    const { error: err } = await sb()!.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(err.message);
    setReady("done");
    setTimeout(() => router.replace("/dashboard"), 1500);
  };

  if (ready === "checking") {
    return (
      <div className="animate-fade-up text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-ocean-600" aria-hidden />
        <h1 className="mt-6 font-display text-2xl font-semibold">Checking your reset link…</h1>
      </div>
    );
  }

  if (ready === "invalid") {
    return (
      <div className="animate-fade-up text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/10">
          <TriangleAlert className="h-10 w-10 text-rose-500" aria-hidden />
        </span>
        <h1 className="mt-6 font-display text-3xl font-semibold">Reset link invalid or expired</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm muted">
          Reset links work once and expire quickly. Request a fresh one and try again.
        </p>
        <Link href="/auth/forgot-password" className="btn-primary btn-md mt-6">
          Request new link
        </Link>
      </div>
    );
  }

  if (ready === "done") {
    return (
      <div className="animate-scale-in text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
          <ShieldCheck className="h-10 w-10 text-emerald-500" aria-hidden />
        </span>
        <h1 className="mt-6 font-display text-3xl font-semibold">Password updated</h1>
        <p className="mt-2 text-sm muted">You're signed in with your new password. Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ocean-600/10">
        <KeyRound className="h-7 w-7 text-ocean-600" aria-hidden />
      </span>
      <h1 className="mt-6 font-display text-3xl font-semibold">Set a new password</h1>
      <p className="mt-2 text-sm muted">Choose a strong password you haven't used before.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {error && (
          <p role="alert" className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="new-pw" className="label-lh">New password</label>
          <div className="relative">
            <input
              id="new-pw"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="input-lh pr-12"
            />
            <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 muted" aria-label={show ? "Hide password" : "Show password"}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="confirm-pw" className="label-lh">Confirm new password</label>
          <input
            id="confirm-pw"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="input-lh"
          />
        </div>
        <button type="submit" disabled={busy} className="btn-primary btn-lg w-full">
          {busy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
