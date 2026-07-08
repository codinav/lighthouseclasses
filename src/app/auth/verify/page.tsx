"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { supabaseConfigured } from "@/lib/config";
import { sb } from "@/lib/sb";

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const real = supabaseConfigured();

  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(params.get("sent") ? "Confirmation email sent." : "");
  const [resendIn, setResendIn] = useState(30);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  /* Clicking the email link signs the user in (possibly in this tab) —
     follow the session straight into the dashboard. */
  useEffect(() => {
    const client = sb();
    if (!client) return;
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setDone(true);
        setTimeout(() => router.replace("/dashboard"), 1200);
      }
    });
    void client.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setDone(true);
        setTimeout(() => router.replace("/dashboard"), 1200);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const submit = async (code: string) => {
    setBusy(true);
    setError("");
    if (real) {
      const client = sb()!;
      const { data, error: err } = await client.auth.verifyOtp({ email, token: code, type: "signup" });
      setBusy(false);
      if (err || !data.session) {
        setError(
          "That code didn't verify. If your email contains a confirmation LINK instead of a code, just click the link — you'll be signed in automatically."
        );
        setDigits(Array(6).fill(""));
        inputs.current[0]?.focus();
        return;
      }
      setDone(true);
      setTimeout(() => router.replace("/dashboard"), 1200);
    } else {
      // Demo fallback: codes ending in an even digit succeed
      await new Promise((r) => setTimeout(r, 700));
      setBusy(false);
      if (parseInt(code[5], 10) % 2 === 0) {
        setDone(true);
        setTimeout(() => router.push("/dashboard"), 1200);
      } else {
        setError("That code didn't match. Demo hint: codes ending in an even digit succeed.");
        setDigits(Array(6).fill(""));
        inputs.current[0]?.focus();
      }
    }
  };

  const resend = async () => {
    setResendIn(30);
    setError("");
    if (real && email) {
      const client = sb()!;
      const { error: err } = await client.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setInfo(err ? "" : "Confirmation email re-sent — check your inbox (and spam).");
      if (err) setError(err.message);
    }
  };

  const setDigit = (i: number, val: string) => {
    const v = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    setError("");
    if (v && i < 5) inputs.current[i + 1]?.focus();
    if (next.every((d) => d !== "")) void submit(next.join(""));
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      setDigits(text.split(""));
      void submit(text);
    }
  };

  if (done) {
    return (
      <div className="animate-scale-in text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
          <ShieldCheck className="h-10 w-10 text-emerald-500" aria-hidden />
        </span>
        <h1 className="mt-6 font-display text-3xl font-semibold">You're verified!</h1>
        <p className="mt-2 text-sm muted">Welcome aboard. Taking you to your dashboard…</p>
        <Loader2 className="mx-auto mt-6 h-6 w-6 animate-spin text-ocean-600" aria-hidden />
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ocean-600/10">
        <MailCheck className="h-7 w-7 text-ocean-600" aria-hidden />
      </span>
      <h1 className="mt-6 font-display text-3xl font-semibold">Confirm your email</h1>
      <p className="mt-2 text-sm leading-relaxed muted">
        We sent a confirmation email to <strong className="text-[var(--lh-ink)]">{email || "your inbox"}</strong>.
        {real
          ? " Click the link inside it — you'll be signed in automatically. If your email shows a 6-digit code instead, enter it below."
          : " Enter the 6-digit code below."}
      </p>
      {info && <p className="mt-3 rounded-2xl bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">{info}</p>}

      <div className="mt-8 flex justify-between gap-2 sm:gap-3" onPaste={onPaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            inputMode="numeric"
            maxLength={1}
            aria-label={`Digit ${i + 1} of 6`}
            className="h-14 w-full rounded-2xl border bg-[var(--lh-card)] text-center font-display text-2xl font-bold transition-all focus:border-ocean-500 focus:shadow-[0_0_0_4px_rgb(179_56_60_/_0.12)] focus:outline-none sm:h-16"
          />
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm font-medium leading-relaxed text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      {busy && (
        <p className="mt-4 flex items-center justify-center gap-2 text-sm muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Verifying…
        </p>
      )}

      <p className="mt-8 text-center text-sm muted">
        Didn't receive it?{" "}
        {resendIn > 0 ? (
          <span>Resend in {resendIn}s</span>
        ) : (
          <button onClick={resend} className="font-semibold text-ocean-600 hover:underline dark:text-gold-400">
            Resend email
          </button>
        )}
      </p>
      <p className="mt-3 text-center text-sm muted">
        Already confirmed?{" "}
        <Link href="/auth/login" className="font-semibold text-ocean-600 hover:underline dark:text-gold-400">
          Sign in
        </Link>
      </p>
    </div>
  );
}
