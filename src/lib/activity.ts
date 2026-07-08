"use client";

/**
 * Real learning-activity engine — local-first, per signed-in email.
 *
 * The video player, live rooms, and quiz runner write events here as they
 * happen; the dashboard derives everything (today's minutes, weekly chart,
 * streak, XP, level, badges) from this log. Completions are additionally
 * merged from Supabase lesson_progress so XP survives a device switch.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAllUserProgress } from "./db";
import { useAuth } from "./providers";

export const DAILY_GOAL_MIN = 45;

export interface QuizAttempt {
  quizId: string;
  title: string;
  courseSlug: string;
  pct: number; // 0–100
  xp: number;
  at: string; // ISO
}

export interface ActivityLog {
  /** "YYYY-MM-DD" (local) → minutes studied that day */
  days: Record<string, number>;
  /** "courseSlug/lessonId" → ISO completed-at */
  completions: Record<string, string>;
  /** live class id → ISO joined-at */
  liveJoins: Record<string, string>;
  quizzes: QuizAttempt[];
}

const EMPTY: ActivityLog = { days: {}, completions: {}, liveJoins: {}, quizzes: [] };
const key = (email: string) => `lh_activity_${email.toLowerCase()}`;

/** Local calendar date as YYYY-MM-DD (not UTC — streaks follow the user's day). */
export function dayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function readActivity(email: string): ActivityLog {
  try {
    const raw = JSON.parse(localStorage.getItem(key(email)) ?? "{}") as Partial<ActivityLog>;
    return {
      days: raw.days ?? {},
      completions: raw.completions ?? {},
      liveJoins: raw.liveJoins ?? {},
      quizzes: raw.quizzes ?? [],
    };
  } catch {
    return { ...EMPTY };
  }
}

function write(email: string, log: ActivityLog) {
  try {
    localStorage.setItem(key(email), JSON.stringify(log));
  } catch {}
}

/* ------------------------------ recorders ------------------------------ */

export function recordWatchMinutes(email: string, minutes: number) {
  if (!email || minutes <= 0) return;
  const log = readActivity(email);
  const today = dayKey();
  log.days[today] = Math.round(((log.days[today] ?? 0) + minutes) * 100) / 100;
  write(email, log);
}

export function recordCompletion(email: string, courseSlug: string, lessonId: string) {
  if (!email) return;
  const log = readActivity(email);
  const k = `${courseSlug}/${lessonId}`;
  if (!log.completions[k]) {
    log.completions[k] = new Date().toISOString();
    write(email, log);
  }
}

export function recordLiveJoin(email: string, liveClassId: string) {
  if (!email) return;
  const log = readActivity(email);
  if (!log.liveJoins[liveClassId]) {
    log.liveJoins[liveClassId] = new Date().toISOString();
    write(email, log);
  }
}

export function recordQuizAttempt(email: string, attempt: QuizAttempt) {
  if (!email) return;
  const log = readActivity(email);
  log.quizzes.push(attempt);
  write(email, log);
}

/** Merge cloud lesson completions (from Supabase) into the local log. */
export async function syncCompletionsFromCloud(email: string): Promise<boolean> {
  const rows = await fetchAllUserProgress(email);
  if (rows.length === 0) return false;
  const log = readActivity(email);
  let changed = false;
  for (const r of rows) {
    const k = `${r.course_slug}/${r.lesson_id}`;
    if (!log.completions[k]) {
      log.completions[k] = r.updated_at ?? new Date().toISOString();
      changed = true;
    }
  }
  if (changed) write(email, log);
  return changed;
}

/* ------------------------------ derived ------------------------------ */

export function todayMinutes(log: ActivityLog): number {
  return Math.round(log.days[dayKey()] ?? 0);
}

/** Last 7 days ending today: [{ day: "Mon", minutes }] */
export function weeklyActivity(log: ActivityLog): { day: string; minutes: number }[] {
  const out: { day: string; minutes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({
      day: d.toLocaleDateString("en-IN", { weekday: "short" }),
      minutes: Math.round(log.days[dayKey(d)] ?? 0),
    });
  }
  return out;
}

/** Consecutive days with ≥1 minute studied. Today counts once you study. */
export function streakDays(log: ActivityLog): number {
  let streak = 0;
  const d = new Date();
  // An untouched today doesn't break the streak — start from yesterday then.
  if ((log.days[dayKey(d)] ?? 0) < 1) d.setDate(d.getDate() - 1);
  while ((log.days[dayKey(d)] ?? 0) >= 1) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function totalMinutes(log: ActivityLog): number {
  return Math.round(Object.values(log.days).reduce((n, m) => n + m, 0));
}

export function lessonsCompleted(log: ActivityLog): number {
  return Object.keys(log.completions).length;
}

/** XP earned from real activity: lessons, minutes, streak, live classes, quizzes. */
export function xpFrom(log: ActivityLog): number {
  return Math.round(
    lessonsCompleted(log) * 50 +
      totalMinutes(log) * 2 +
      streakDays(log) * 10 +
      Object.keys(log.liveJoins).length * 100 +
      log.quizzes.reduce((n, q) => n + q.xp, 0)
  );
}

export const XP_PER_LEVEL = 500;

const LEVEL_TITLES = [
  "First Spark",
  "Candle Flame",
  "Lantern Bearer",
  "Harbour Light",
  "Wave Rider",
  "Torch Bearer",
  "Beacon Keeper",
  "Storm Light",
  "Ray of Dawn",
  "Lighthouse Keeper",
];

export function levelFor(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function levelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1];
}

export interface ActivityStats {
  log: ActivityLog;
  todayMin: number;
  weekly: { day: string; minutes: number }[];
  streak: number;
  totalMin: number;
  lessonsDone: number;
  xp: number;
  level: number;
  title: string;
  /** XP into the current level / needed for the next one */
  levelXp: number;
  loading: boolean;
  refresh: () => void;
}

/** Live stats for the signed-in user; refreshes on tab focus (post-lesson). */
export function useActivity(): ActivityStats {
  const { user } = useAuth();
  const email = user?.email ?? "";
  const [log, setLog] = useState<ActivityLog>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!email) return;
    setLog(readActivity(email));
    setLoading(false);
  }, [email]);

  useEffect(() => {
    refresh();
    if (email) {
      void syncCompletionsFromCloud(email).then((changed) => changed && refresh());
    }
    const onWake = () => refresh();
    window.addEventListener("focus", onWake);
    window.addEventListener("pageshow", onWake);
    document.addEventListener("visibilitychange", onWake);
    return () => {
      window.removeEventListener("focus", onWake);
      window.removeEventListener("pageshow", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, [refresh, email]);

  return useMemo(() => {
    const xp = xpFrom(log);
    const level = levelFor(xp);
    return {
      log,
      todayMin: todayMinutes(log),
      weekly: weeklyActivity(log),
      streak: streakDays(log),
      totalMin: totalMinutes(log),
      lessonsDone: lessonsCompleted(log),
      xp,
      level,
      title: levelTitle(level),
      levelXp: xp - (level - 1) * XP_PER_LEVEL,
      loading,
      refresh,
    };
  }, [log, loading, refresh]);
}
