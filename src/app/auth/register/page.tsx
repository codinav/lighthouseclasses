"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { AlertCircle, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/providers";
import { SocialButtons, OrDivider } from "@/components/auth/social-buttons";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [updates, setUpdates] = useState(true);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const strength = useMemo(() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
    if (/\d/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  }, [password]);
  const strengthLabel = ["Too short", "Weak", "Okay", "Strong", "Excellent"][strength];
  const strengthColor = ["bg-rose-500", "bg-rose-500", "bg-gold-400", "bg-emerald-500", "bg-emerald-500"][strength];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await register(name, email, password, updates, phone);
    setBusy(false);
    if (res.ok && res.code === "confirm") {
      // Real confirmation email sent — verify before first login
      router.push(`/auth/verify?email=${encodeURIComponent(email)}&sent=1`);
    } else if (res.ok) {
      router.push("/dashboard");
    } else {
      setError(res.error ?? "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-3xl font-semibold">Start your journey</h1>
      <p className="mt-2 text-sm muted">
        Free forever plan. Starter lessons in every course, no card required.
      </p>

      <div className="mt-8">
        <SocialButtons />
        <OrDivider />

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error && (
            <p role="alert" className="flex items-center gap-2 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden /> {error}
            </p>
          )}
          <div>
            <label htmlFor="name" className="label-lh">Full name</label>
            <input id="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Aarav Sharma" className="input-lh" />
          </div>
          <div>
            <label htmlFor="email" className="label-lh">Email address</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input-lh" />
          </div>
          <div>
            <label htmlFor="phone" className="label-lh">Phone number</label>
            <input id="phone" type="tel" autoComplete="tel" inputMode="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="input-lh" />
            <p className="mt-1 text-2xs muted">So we can reach you about class schedules and updates.</p>
          </div>
          <div>
            <label htmlFor="password" className="label-lh">Password</label>
            <div className="relative">
              <input
                id="password"
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
            {password && (
              <div className="mt-2">
                <div className="flex gap-1.5" aria-hidden>
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className={cn("h-1 flex-1 rounded-full transition-colors", i < strength ? strengthColor : "bg-navy-900/10 dark:bg-white/10")} />
                  ))}
                </div>
                <p className="mt-1 text-2xs font-semibold muted">Password strength: {strengthLabel}</p>
              </div>
            )}
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border bg-[var(--lh-card)] p-4">
            <input
              type="checkbox"
              checked={updates}
              onChange={(e) => setUpdates(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#b3383c]"
            />
            <span className="text-sm leading-snug">
              <span className="font-semibold">Email me class updates</span>
              <span className="block text-xs muted">
                New courses, live class schedules, and announcements. Unsubscribe anytime.
              </span>
            </span>
          </label>

          <button type="submit" disabled={busy} className="btn-gold btn-lg w-full">
            {busy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
            {busy ? "Creating account…" : "Create free account"}
          </button>

          <ul className="grid grid-cols-2 gap-2 pt-2 text-xs muted">
            {["Free starter lessons", "Learning streaks & XP", "Community access", "Cancel anytime"].map((f) => (
              <li key={f} className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden /> {f}
              </li>
            ))}
          </ul>
        </form>

        <p className="mt-6 text-center text-sm muted">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-semibold text-ocean-600 hover:underline dark:text-gold-400">
            Sign in
          </Link>
        </p>
        <p className="mt-4 text-center text-2xs leading-relaxed muted">
          By creating an account you agree to our{" "}
          <Link href="/terms" className="underline">Terms of Service</Link> and{" "}
          <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
