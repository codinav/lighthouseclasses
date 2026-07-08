"use client";

/**
 * Real notifications — assembled from live data, not a canned list:
 *  · live classes starting within 48h (or live right now)
 *  · teacher announcements (Supabase announcements table)
 *  · achievements the user has actually earned
 *  · a streak-protection reminder when today is still at zero
 * Read state persists per user in localStorage.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppNotification } from "./types";
import { fetchAnnouncements } from "./db";
import { fetchMergedLiveClasses } from "./live-classes";
import { readActivity, streakDays, todayMinutes } from "./activity";
import { computeAchievements } from "./achievements";
import { fetchMergedEnrollments } from "./enrollments";
import { useAuth } from "./providers";

const readKey = (email: string) => `lh_notif_read_${email.toLowerCase()}`;

function readIds(email: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(readKey(email)) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diff);
  const min = Math.round(abs / 60000);
  const label = min < 60 ? `${Math.max(1, min)}m` : min < 1440 ? `${Math.round(min / 60)}h` : `${Math.round(min / 1440)}d`;
  return diff >= 0 ? label : `in ${label}`;
}

async function buildNotifications(email: string): Promise<AppNotification[]> {
  const log = readActivity(email);
  const [{ classes }, announcements, enrollments] = await Promise.all([
    fetchMergedLiveClasses().catch(() => ({ classes: [], live: false })),
    fetchAnnouncements().catch(() => []),
    fetchMergedEnrollments(email).catch(() => []),
  ]);

  const out: AppNotification[] = [];
  const now = Date.now();

  // Live classes: on air now, or starting within 48 hours
  for (const lc of classes) {
    const start = new Date(lc.startsAt).getTime();
    const end = start + lc.durationMin * 60_000;
    const liveNow = now >= start && now <= end;
    const soon = start > now && start - now < 48 * 3_600_000;
    if (!liveNow && !soon) continue;
    out.push({
      id: `live-${lc.id}`,
      title: liveNow ? `Live now: ${lc.title}` : `Upcoming live class: ${lc.title}`,
      body: liveNow
        ? "The room is open — join before the seats at the front go."
        : `Starts ${new Date(lc.startsAt).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit", hour12: true })}. Join from the Live page.`,
      time: liveNow ? "now" : relTime(lc.startsAt),
      type: "live",
      read: false,
    });
  }

  // Teacher announcements
  for (const a of announcements.slice(0, 5)) {
    out.push({
      id: `ann-${a.id}`,
      title: a.title,
      body: a.body,
      time: a.created_at ? relTime(a.created_at) : "",
      type: "announcement",
      read: false,
    });
  }

  // Earned achievements (most recent first)
  const earned = computeAchievements(log, enrollments)
    .filter((b) => b.earned)
    .sort((a, b) => (b.earnedAt ?? "").localeCompare(a.earnedAt ?? ""))
    .slice(0, 3);
  for (const b of earned) {
    out.push({
      id: `badge-${b.id}`,
      title: `You earned '${b.title}' 🏆`,
      body: `${b.description} — done. +${b.xp} XP bonus badge on your profile.`,
      time: b.earnedAt ? relTime(b.earnedAt) : "",
      type: "achievement",
      read: false,
    });
  }

  // Streak protection
  const streak = streakDays(log);
  if (streak > 0 && todayMinutes(log) < 1 && enrollments.length > 0) {
    out.push({
      id: `streak-${new Date().toISOString().slice(0, 10)}`,
      title: "Don't break your streak! 🔥",
      body: `You're on a ${streak}-day streak. Watch one lesson today to keep it alive.`,
      time: "today",
      type: "reminder",
      read: false,
    });
  }

  const seen = new Set(readIds(email));
  return out.map((n) => ({ ...n, read: seen.has(n.id) }));
}

export function useNotifications(): {
  items: AppNotification[];
  unread: number;
  loading: boolean;
  markAllRead: () => void;
} {
  const { user } = useAuth();
  const email = user?.email ?? "";
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    void buildNotifications(email).then((n) => {
      if (!cancelled) {
        setItems(n);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [email]);

  const markAllRead = useCallback(() => {
    if (!email) return;
    setItems((prev) => {
      try {
        localStorage.setItem(readKey(email), JSON.stringify(prev.map((n) => n.id)));
      } catch {}
      return prev.map((n) => ({ ...n, read: true }));
    });
  }, [email]);

  return useMemo(
    () => ({ items, unread: items.filter((n) => !n.read).length, loading, markAllRead }),
    [items, loading, markAllRead]
  );
}
