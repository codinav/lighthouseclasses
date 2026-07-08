"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarClock, Flame, Play, Sparkles, Target, Zap } from "lucide-react";
import { useAuth } from "@/lib/providers";
import { useEnrollments } from "@/lib/use-enrollments";
import { getCourse } from "@/lib/data";
import { fetchMergedCourses, learnHref } from "@/lib/courses";
import { fetchMergedLiveClasses } from "@/lib/live-classes";
import { DAILY_GOAL_MIN, useActivity } from "@/lib/activity";
import { computeAchievements } from "@/lib/achievements";
import type { Course, LiveClass } from "@/lib/types";
import { formatHoursMin } from "@/lib/utils";
import { CourseCover } from "@/components/ui/course-cover";
import { ProgressBar, ProgressRing } from "@/components/ui/progress";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { LiveClassCard } from "@/components/live/live-card";
import { CourseCard } from "@/components/course/course-card";
import { DynamicIcon } from "@/components/ui/icon";

export default function DashboardPage() {
  const { user } = useAuth();
  const { enrollments, loading: enrollmentsLoading, courseFor } = useEnrollments();
  const stats = useActivity();
  const [catalog, setCatalog] = useState<Course[]>([]);
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);

  useEffect(() => {
    void fetchMergedCourses().then(setCatalog);
    void fetchMergedLiveClasses().then(({ classes }) => {
      const now = Date.now();
      setLiveClasses(
        classes
          .filter((lc) => new Date(lc.startsAt).getTime() + lc.durationMin * 60_000 > now)
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      );
    });
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name.split(" ")[0] ?? "learner";
  const goalPct = Math.min(100, Math.round((stats.todayMin / DAILY_GOAL_MIN) * 100));
  const recommended = catalog.filter((c) => !enrollments.some((e) => e.courseSlug === c.slug)).slice(0, 3);

  const badges = computeAchievements(stats.log, enrollments);
  const earned = badges
    .filter((b) => b.earned)
    .sort((a, b) => (b.earnedAt ?? "").localeCompare(a.earnedAt ?? ""));
  const nextUp = badges.filter((b) => !b.earned).sort((a, b) => b.progress - a.progress);
  const badgePanel = [...earned.slice(0, 3), ...nextUp].slice(0, 3);

  return (
    <div className="space-y-10">
      {/* Welcome + streak strip */}
      <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="card relative overflow-hidden bg-gradient-to-br from-navy-900 to-ocean-800 p-6 text-white sm:p-8">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-gold-400/20 blur-3xl" aria-hidden />
          <p className="text-sm text-white/60">{greeting},</p>
          <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{firstName} 👋</h1>
          <p className="mt-2 max-w-md text-sm text-white/70">
            {stats.todayMin >= DAILY_GOAL_MIN
              ? "You're past your daily goal — the beam is burning bright."
              : stats.todayMin > 0
                ? `You're ${DAILY_GOAL_MIN - stats.todayMin} minutes away from your daily goal. Keep the beam burning.`
                : "Watch any lesson to light today's beam — your streak and XP grow as you learn."}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <Flame className="h-6 w-6 text-gold-400" aria-hidden />
              </span>
              <div>
                <p className="font-display text-xl font-bold">{stats.streak} {stats.streak === 1 ? "day" : "days"}</p>
                <p className="text-xs text-white/60">Current streak</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <Zap className="h-6 w-6 text-gold-400" aria-hidden />
              </span>
              <div>
                <p className="font-display text-xl font-bold">{new Intl.NumberFormat("en-IN").format(stats.xp)} XP</p>
                <p className="text-xs text-white/60">Level {stats.level} · {stats.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ProgressRing value={goalPct} size={52} stroke={5}>
                <Target className="h-4 w-4 text-gold-400" aria-hidden />
              </ProgressRing>
              <div>
                <p className="font-display text-xl font-bold">{stats.todayMin}/{DAILY_GOAL_MIN} min</p>
                <p className="text-xs text-white/60">Daily goal · {goalPct}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly activity — real minutes from the player */}
        <div className="card p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest muted">This week</h2>
          <div className="mt-4">
            <ActivityChart data={stats.weekly} />
          </div>
        </div>
      </section>

      {/* Continue learning */}
      <section>
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-xl font-semibold sm:text-2xl">Continue learning</h2>
          <Link href="/dashboard/my-courses" className="text-sm font-semibold text-ocean-600 hover:underline dark:text-gold-400">
            My courses →
          </Link>
        </div>
        {!enrollmentsLoading && enrollments.length === 0 && (
          <div className="card mt-4 flex flex-col items-center gap-3 border-dashed p-10 text-center">
            <Play className="h-8 w-8 muted" aria-hidden />
            <p className="font-display text-lg font-semibold">Your learning journey starts here</p>
            <p className="max-w-sm text-sm muted">
              Buy a course — or watch any free preview lesson — and it appears right here with your progress.
            </p>
            <Link href="/courses" className="btn-ocean btn-md mt-1">Browse courses</Link>
          </div>
        )}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {enrollments.slice(0, 3).map((e) => {
            const course = getCourse(e.courseSlug) ?? courseFor(e.courseSlug);
            if (!course) return null;
            return (
              <Link
                key={e.courseSlug}
                href={learnHref(course, e.lastLessonId || undefined)}
                className="card card-hover group flex gap-4 p-4"
              >
                <div className="relative w-28 shrink-0 self-start overflow-hidden rounded-2xl sm:w-32">
                  <CourseCover gradient={course.gradient} icon={course.icon} thumbnail={course.thumbnail} className="aspect-video" iconClassName="h-7 w-7" />
                  <span className="absolute inset-0 flex items-center justify-center bg-navy-950/30 opacity-0 transition-opacity group-hover:opacity-100">
                    <Play className="h-6 w-6 fill-white text-white" aria-hidden />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-2xs font-bold uppercase tracking-widest text-ocean-600 dark:text-ocean-300">{course.category}</p>
                  <h3 className="mt-0.5 line-clamp-1 text-sm font-semibold">{course.title}</h3>
                  <p className="mt-0.5 line-clamp-1 text-xs muted">Next: {e.lastLessonTitle}</p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <ProgressBar value={e.progress} className="h-1.5 flex-1" label={`${course.title} progress`} />
                    <span className="text-xs font-bold tabular-nums">{e.progress}%</span>
                  </div>
                  <p className="mt-1.5 text-2xs muted">{formatHoursMin(e.timeLeftMin)} left</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Live + achievements */}
      <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-xl font-semibold sm:text-2xl">Upcoming live classes</h2>
            <Link href="/live" className="text-sm font-semibold text-ocean-600 hover:underline dark:text-gold-400">
              Full schedule →
            </Link>
          </div>
          {liveClasses.length === 0 ? (
            <div className="card mt-4 flex flex-col items-center gap-2 border-dashed p-8 text-center">
              <CalendarClock className="h-7 w-7 muted" aria-hidden />
              <p className="text-sm font-semibold">Nothing scheduled right now</p>
              <p className="max-w-xs text-xs muted">New live classes appear here the moment your teachers schedule them.</p>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {liveClasses.slice(0, 2).map((lc) => (
                <LiveClassCard key={lc.id} lc={lc} compact />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-xl font-semibold sm:text-2xl">Achievements</h2>
            <Link href="/dashboard/achievements" className="text-sm font-semibold text-ocean-600 hover:underline dark:text-gold-400">
              All →
            </Link>
          </div>
          <div className="card mt-4 space-y-3 p-5">
            {badgePanel.map((b) => (
              <div key={b.id} className={b.earned ? "flex items-center gap-3" : "flex items-center gap-3 opacity-70"}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold-400/15 text-gold-600 dark:text-gold-400">
                  <DynamicIcon name={b.icon} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{b.title}</p>
                  <p className="truncate text-xs muted">{b.description}</p>
                  {!b.earned && b.progress > 0 && (
                    <ProgressBar value={b.progress} className="mt-1.5 h-1" label={`${b.title} progress`} />
                  )}
                </div>
                <span className="ml-auto shrink-0 text-xs font-bold text-gold-600 dark:text-gold-400">
                  {b.earned ? `+${b.xp}` : `${b.progress}%`}
                </span>
              </div>
            ))}
            <div className="border-t pt-3">
              <p className="flex items-center gap-2 text-xs muted">
                <Sparkles className="h-3.5 w-3.5 text-gold-400" aria-hidden />
                {earned.length} of {badges.length} badges earned — {badges.length - earned.length} still waiting
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recommended */}
      {recommended.length > 0 && (
        <section>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-semibold sm:text-2xl">Recommended for you</h2>
              <p className="mt-1 text-sm muted">Courses you haven't started yet.</p>
            </div>
            <Link href="/courses" className="btn-ghost btn-sm hidden whitespace-nowrap sm:inline-flex">
              Explore all <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-4 flex snap-x gap-4 overflow-x-auto pb-4 scrollbar-none lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
            {recommended.map((c) => (
              <CourseCard key={c.slug} course={c} className="w-[80vw] max-w-sm shrink-0 snap-start lg:w-auto lg:max-w-none" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
