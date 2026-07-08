"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, BookOpen, Database, UserPlus, Users } from "lucide-react";
import { AreaSeries, LabelBars, ShareDonut, type SeriesPoint } from "@/components/admin/charts";
import { LiveSignups } from "@/components/admin/live-signups";
import { ENROLLMENTS_BY_CATEGORY, REVENUE_BY_PLAN, REVENUE_MONTHLY } from "@/lib/admin-data";

import { fetchAllEnrollments, fetchProfiles, type EnrollmentLite, type ProfileRow } from "@/lib/db";
import { cn } from "@/lib/utils";

const DAY = 86400000;

export default function AdminAnalyticsPage() {
  const [profiles, setProfiles] = useState<ProfileRow[] | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentLite[]>([]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchProfiles(), fetchAllEnrollments()]).then(([p, e]) => {
      if (cancelled) return;
      setProfiles(p);
      setEnrollments(e);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const live = (profiles?.length ?? 0) > 0;

  const stats = useMemo(() => {
    if (!live || !profiles) return null;
    const now = Date.now();
    const newThirty = profiles.filter((p) => now - new Date(p.created_at).getTime() < 30 * DAY).length;
    const activeSeven = profiles.filter((p) => now - new Date(p.last_active_at).getTime() < 7 * DAY).length;
    const purchases = enrollments.filter((e) => e.source === "purchase").length;

    // Signups per day, last 30 days
    const byDay = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * DAY);
      byDay.set(d.toISOString().slice(0, 10), 0);
    }
    for (const p of profiles) {
      const key = p.created_at.slice(0, 10);
      if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }
    const signupSeries: SeriesPoint[] = Array.from(byDay.entries()).map(([iso, v]) => ({
      label: new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      value: v,
    }));

    // Enrollments by category
    const catCounts = new Map<string, number>();
    for (const e of enrollments) {
      const cat = "Courses";
      catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
    }
    const categories: SeriesPoint[] = Array.from(catCounts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Plan share
    const planCounts = { Spark: 0, Beacon: 0, Lighthouse: 0 } as Record<string, number>;
    for (const p of profiles) planCounts[p.plan] = (planCounts[p.plan] ?? 0) + 1;
    const totalPlans = Math.max(1, profiles.length);
    const plans: SeriesPoint[] = (["Beacon", "Lighthouse", "Spark"] as const).map((label) => ({
      label,
      value: (planCounts[label] / totalPlans) * 100,
    }));

    return { newThirty, activeSeven, purchases, signupSeries, categories, plans };
  }, [live, profiles, enrollments]);

  const tiles = live && stats && profiles
    ? [
        { label: "Total students", value: new Intl.NumberFormat("en-IN").format(profiles.length), icon: Users },
        { label: "New signups (30d)", value: new Intl.NumberFormat("en-IN").format(stats.newThirty), icon: UserPlus },
        { label: "Active (7d)", value: new Intl.NumberFormat("en-IN").format(stats.activeSeven), icon: Activity },
        { label: `Enrollments (${stats.purchases} purchased)`, value: new Intl.NumberFormat("en-IN").format(enrollments.length), icon: BookOpen },
      ]
    : [
        { label: "Revenue (June) — demo", value: "₹58.7L", icon: Users },
        { label: "Active students — demo", value: "2,41,306", icon: Users },
        { label: "New signups (30d) — demo", value: "18,204", icon: UserPlus },
        { label: "Avg. completion — demo", value: "92%", icon: BookOpen },
      ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Analytics</h1>
        <p className="mt-1 flex items-center gap-2 text-sm muted">
          <Database className="h-3.5 w-3.5" aria-hidden />
          {profiles === null
            ? "Loading…"
            : live
              ? "Live data from your platform"
              : "Demo data — real analytics appear as accounts and enrollments come in"}
          {live && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />}
        </p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card p-5">
            <t.icon className="h-5 w-5 muted" aria-hidden />
            <p className={cn("mt-3 font-display text-2xl font-bold tabular-nums", profiles === null && "skeleton h-8 w-20")}>
              {profiles === null ? "" : t.value}
            </p>
            <p className="mt-0.5 text-xs muted">{t.label}</p>
          </div>
        ))}
      </div>

      {/* Real-time signups feed */}
      <LiveSignups limit={12} />

      {/* Time series */}
      <div className="card p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">
            {live ? "Signups — last 30 days" : "Revenue — last 11 months (demo)"}
          </h2>
          <p className="text-xs muted">{live ? "New accounts per day" : "₹ lakh · GST inclusive"}</p>
        </div>
        <div className="mt-4">
          {live && stats ? (
            <AreaSeries points={stats.signupSeries} ariaLabel="New accounts per day, last 30 days" format={(v) => `${v} signup${v === 1 ? "" : "s"}`} tickEvery={5} />
          ) : (
            <AreaSeries points={REVENUE_MONTHLY.map((r) => ({ label: r.month, value: r.revenue }))} ariaLabel="Monthly revenue in lakh rupees (demo)" format={(v) => `₹${v}L`} />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold">Plan share</h2>
          <p className="text-xs muted">{live ? "All accounts by plan" : "Share of June revenue (demo)"}</p>
          <div className="mt-5">
            {live && stats && profiles ? (
              <ShareDonut
                slices={stats.plans}
                centerTitle={new Intl.NumberFormat("en-IN").format(profiles.length)}
                centerSub="students"
                ariaLabel={`Accounts by plan: ${stats.plans.map((p) => `${p.label} ${Math.round(p.value)} percent`).join(", ")}`}
              />
            ) : (
              <ShareDonut
                slices={REVENUE_BY_PLAN.map((p) => ({ label: p.plan, value: p.value }))}
                centerTitle="₹58.7L"
                centerSub="June revenue"
                ariaLabel="Demo revenue share by plan"
              />
            )}
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold">Enrollments by category</h2>
          <p className="text-xs muted">{live ? "All time" : "Last 90 days (demo)"}</p>
          <div className="mt-5">
            {live && stats && stats.categories.length > 0 ? (
              <LabelBars items={stats.categories} ariaLabel="Enrollments by category" />
            ) : (
              <LabelBars items={ENROLLMENTS_BY_CATEGORY.map((c) => ({ label: c.category, value: c.count }))} ariaLabel="Demo enrollments by category" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
