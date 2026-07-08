"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/providers";
import { supabaseConfigured } from "@/lib/config";
import { SocialButtons, OrDivider } from "@/components/auth/social-buttons";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Already signed in (e.g. arrived from a confirmation link) → go through
  useEffect(() => {
    if (!loading && user) router.replace(params.get("next") ?? "/dashboard");
  }, [loading, user, router, params]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await login(email, password);
    setBusy(false);
    if (res.ok) {
      router.push(params.get("next") ?? "/dashboard");
    } else if (res.code === "unconfirmed") {
      router.push(`/auth/verify?email=${encodeURIComponent(email)}`);
    } else {
      setError(res.error ?? "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-3xl font-semibold">Welcome back</h1>
      <p className="mt-2 text-sm muted">
        The light's still on. Pick up right where you left off.
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
            <label htmlFor="email" className="label-lh">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-lh"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="label-lh">Password</label>
              <Link href="/auth/forgot-password" className="text-xs font-semibold text-ocean-600 hover:underline dark:text-gold-400">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-lh pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 muted"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={busy} className="btn-primary btn-lg w-full">
            {busy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm muted">
          New to Lighthouse?{" "}
          <Link href="/auth/register" className="font-semibold text-ocean-600 hover:underline dark:text-gold-400">
            Create a free account
          </Link>
        </p>
        {supabaseConfigured() && (
          <p className="mt-4 rounded-2xl bg-ocean-600/5 px-4 py-3 text-center text-xs muted dark:bg-white/5">
            Sign in with the account you created. Admin access is granted by the platform owner.
          </p>
        )}
      </div>
    </div>
  );
}
