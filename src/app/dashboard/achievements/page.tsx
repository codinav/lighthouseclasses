"use client";

import { Lock } from "lucide-react";
import { XP_PER_LEVEL, levelTitle, useActivity } from "@/lib/activity";
import { computeAchievements } from "@/lib/achievements";
import { useEnrollments } from "@/lib/use-enrollments";
import { DynamicIcon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function AchievementsPage() {
  const stats = useActivity();
  const { enrollments } = useEnrollments();
  const badges = computeAchievements(stats.log, enrollments);
  const nextLevelXp = stats.level * XP_PER_LEVEL;
  const pct = Math.min(100, Math.round((stats.levelXp / XP_PER_LEVEL) * 100));

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">Achievements</h1>
      <p className="mt-1 text-sm muted">
        Everything here is earned by actually learning — lessons, watch time, streaks, quizzes, and live classes.
      </p>

      {/* Level progress — real XP */}
      <div className="card mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-2xs font-bold uppercase tracking-widest muted">Current level</p>
            <p className="font-display text-2xl font-bold">
              Level {stats.level} · <span className="text-gradient-ocean">{stats.title}</span>
            </p>
          </div>
          <p className="text-sm muted">
            <strong className="text-[var(--lh-ink)]">{new Intl.NumberFormat("en-IN").format(stats.xp)}</strong> /{" "}
            {new Intl.NumberFormat("en-IN").format(nextLevelXp)} XP to Level {stats.level + 1}
          </p>
        </div>
        <ProgressBar value={pct} className="mt-4 h-3" barClassName="bg-gradient-to-r from-gold-400 to-gold-300" label="Level progress" />
        <p className="mt-2 text-xs muted">
          Next: {levelTitle(stats.level + 1)} — earn XP with every lesson (+50), study minute (+2), streak day (+10),
          live class (+100), and quiz.
        </p>
      </div>

      {/* Real stats strip */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [String(stats.lessonsDone), "Lessons completed"],
          [`${Math.floor(stats.totalMin / 60)}h ${stats.totalMin % 60}m`, "Total study time"],
          [`${stats.streak} ${stats.streak === 1 ? "day" : "days"}`, "Current streak"],
          [String(stats.log.quizzes.length), "Quiz attempts"],
        ].map(([v, l]) => (
          <div key={l} className="card p-4 text-center">
            <p className="font-display text-xl font-bold">{v}</p>
            <p className="mt-0.5 text-2xs uppercase tracking-widest muted">{l}</p>
          </div>
        ))}
      </div>

      {/* Badge grid */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {badges.map((a) => (
          <div
            key={a.id}
            className={cn(
              "card relative flex flex-col items-center p-5 text-center transition-all",
              a.earned ? "card-hover" : "opacity-60 grayscale"
            )}
          >
            {!a.earned && <Lock className="absolute right-3 top-3 h-4 w-4 muted" aria-label="Locked" />}
            <span
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full",
                a.earned
                  ? "bg-gradient-to-br from-gold-400 to-gold-600 text-navy-950 shadow-glow"
                  : "bg-navy-900/10 text-navy-900/40 dark:bg-white/10 dark:text-white/40"
              )}
            >
              <DynamicIcon name={a.icon} className="h-8 w-8" />
            </span>
            <p className="mt-3 text-sm font-bold">{a.title}</p>
            <p className="mt-1 text-xs leading-snug muted">{a.description}</p>
            {a.earned ? (
              <p className="mt-2 text-2xs font-bold text-gold-600 dark:text-gold-400">
                {a.earnedAt
                  ? `Earned ${new Date(a.earnedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                  : "Earned"}
              </p>
            ) : (
              <div className="mt-2 w-full">
                <ProgressBar value={a.progress} className="h-1" label={`${a.title} progress`} />
                <p className="mt-1 text-2xs font-bold muted">{a.progress}% · +{a.xp} XP</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
