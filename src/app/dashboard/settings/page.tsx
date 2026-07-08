"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Crown, LogOut, Moon, ShieldCheck, Sun } from "lucide-react";
import { useAuth, useTheme } from "@/lib/providers";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const TOGGLE_KEYS = {
  live: "lh_pref_live",
  assignments: "lh_pref_assignments",
  streak: "lh_pref_streak",
  announcements: "lh_pref_announcements",
  weekly: "lh_pref_weekly",
} as const;

function Toggle({ label, description, storageKey, defaultOn = true }: { label: string; description: string; storageKey: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) setOn(saved === "1");
  }, [storageKey]);

  const flip = () => {
    setOn((v) => {
      const next = !v;
      try {
        localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs muted">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={flip}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          on ? "bg-ocean-600 dark:bg-gold-400" : "bg-navy-900/15 dark:bg-white/15"
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all dark:bg-navy-950",
            on ? "left-6" : "left-1"
          )}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { user, logout, updateName } = useAuth();
  const { theme, toggle } = useTheme();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2 || name.trim() === user?.name) return;
    setSaving(true);
    await updateName(name);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm muted">Your profile, preferences, and plan.</p>
      </div>

      {/* Profile */}
      <section className="card p-6" aria-labelledby="profile-h">
        <h2 id="profile-h" className="font-display text-lg font-semibold">Profile</h2>
        <div className="mt-5 flex items-center gap-4">
          <Avatar name={user?.name ?? "You"} src={user?.avatarUrl} className="h-16 w-16 text-xl" />
          <div>
            <p className="font-semibold">{user?.name}</p>
            <p className="text-sm muted">{user?.email}</p>
            <p className="text-xs muted">
              Member since {new Date(user?.joinedAt ?? Date.now()).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
              {" · "}signs in with {user?.provider === "google" ? "Google" : "email"}
            </p>
          </div>
        </div>
        <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={save}>
          <div>
            <label htmlFor="s-name" className="label-lh">Full name</label>
            <input id="s-name" value={name} onChange={(e) => setName(e.target.value)} className="input-lh" />
          </div>
          <div>
            <label htmlFor="s-email" className="label-lh">Email</label>
            <input id="s-email" type="email" value={user?.email ?? ""} disabled className="input-lh opacity-60" />
            <p className="mt-1 text-2xs muted">Your email is your login and can't be changed here.</p>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={saving || name.trim() === user?.name || name.trim().length < 2} className="btn-primary btn-md">
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
            </button>
          </div>
        </form>
      </section>

      {/* Appearance */}
      <section className="card p-6" aria-labelledby="appearance-h">
        <h2 id="appearance-h" className="font-display text-lg font-semibold">Appearance</h2>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Theme</p>
            <p className="text-xs muted">Dark mode is easier on the eyes during late-night study.</p>
          </div>
          <button onClick={toggle} className="btn-ghost btn-md">
            {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
            {theme === "dark" ? "Switch to light" : "Switch to dark"}
          </button>
        </div>
      </section>

      {/* Notifications */}
      <section className="card divide-y p-6 [&>div]:py-3" aria-labelledby="notif-h">
        <h2 id="notif-h" className="pb-3 font-display text-lg font-semibold">Notifications</h2>
        <Toggle label="Live class reminders" description="Before any class you've joined" storageKey={TOGGLE_KEYS.live} />
        <Toggle label="Assignment deadlines" description="A nudge before each quiz or task" storageKey={TOGGLE_KEYS.assignments} />
        <Toggle label="Streak protection" description="Evening reminder if you haven't studied yet" storageKey={TOGGLE_KEYS.streak} />
        <Toggle label="Course announcements" description="Updates from teachers of your courses" storageKey={TOGGLE_KEYS.announcements} />
        <Toggle label="Weekly progress email" description="Your Sunday learning summary" storageKey={TOGGLE_KEYS.weekly} defaultOn={false} />
      </section>

      {/* Subscription */}
      <section className="card overflow-hidden" aria-labelledby="plan-h">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-navy-900 to-ocean-800 p-6 text-white">
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8 text-gold-400" aria-hidden />
            <div>
              <h2 id="plan-h" className="font-display text-lg font-semibold">{user?.plan} plan</h2>
              <p className="text-xs text-white/65">Your current access tier</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/pricing" className="btn-gold btn-sm">View plans</Link>
          </div>
        </div>

        <div className="flex items-start gap-3 p-6">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-ocean-600 dark:text-gold-400" aria-hidden />
          <p className="text-sm muted">
            Online payments and invoices are being set up. Until then, your plan is managed manually —
            reach us at <a href="mailto:support@lighthouseclasses.com" className="font-semibold text-ocean-600 hover:underline dark:text-gold-400">support@lighthouseclasses.com</a> to upgrade or change it. Your billing history will appear here once payments go live.
          </p>
        </div>
      </section>

      {/* Sign out */}
      <section className="card flex items-center justify-between gap-4 border-rose-500/20 p-6">
        <div>
          <h2 className="font-display text-lg font-semibold">Sign out</h2>
          <p className="text-xs muted">Your progress and streak are safe — sign back in anytime.</p>
        </div>
        <button onClick={logout} className="btn btn-md border border-rose-500/40 text-rose-500 hover:bg-rose-500/10">
          <LogOut className="h-4 w-4" aria-hidden /> Sign out
        </button>
      </section>
    </div>
  );
}
