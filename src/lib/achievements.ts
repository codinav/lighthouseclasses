"use client";

/**
 * Achievement engine — every badge is computed from the user's REAL
 * activity log and enrollments; nothing is pre-earned.
 */

import type { ActivityLog } from "./activity";
import { levelFor, streakDays, totalMinutes, xpFrom } from "./activity";
import type { Enrollment } from "./progress";

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string; // lucide icon name (DynamicIcon)
  xp: number; // shown as the badge's bonus value
  earned: boolean;
  earnedAt?: string; // ISO
  /** 0–100 progress toward earning it (for locked badges) */
  progress: number;
}

function earliestCompletion(log: ActivityLog): string | undefined {
  const times = Object.values(log.completions).sort();
  return times[0];
}

export function computeAchievements(log: ActivityLog, enrollments: Enrollment[]): Badge[] {
  const completions = Object.entries(log.completions);
  const streak = streakDays(log);
  const minutes = totalMinutes(log);
  const level = levelFor(xpFrom(log));
  const liveJoined = Object.values(log.liveJoins).sort();
  const perfectQuiz = log.quizzes.filter((q) => q.pct === 100).sort((a, b) => a.at.localeCompare(b.at));
  const nightOwl = completions
    .filter(([, iso]) => {
      const h = new Date(iso).getHours();
      return h >= 0 && h < 5;
    })
    .map(([, iso]) => iso)
    .sort();
  const finished = enrollments
    .filter((e) => e.progress >= 100)
    .sort((a, b) => a.lastWatchedAt.localeCompare(b.lastWatchedAt));

  const pct = (have: number, need: number) => Math.min(100, Math.round((have / need) * 100));

  return [
    {
      id: "first-light",
      title: "First Light",
      description: "Complete your first lesson",
      icon: "Sunrise",
      xp: 50,
      earned: completions.length >= 1,
      earnedAt: earliestCompletion(log),
      progress: pct(completions.length, 1),
    },
    {
      id: "week-of-fire",
      title: "Week of Fire",
      description: "Maintain a 7-day learning streak",
      icon: "Flame",
      xp: 200,
      earned: streak >= 7,
      progress: pct(streak, 7),
    },
    {
      id: "harf-shanaas",
      title: "Harf Shanaas",
      description: "Score 100% on a course quiz",
      icon: "Zap",
      xp: 150,
      earned: perfectQuiz.length >= 1,
      earnedAt: perfectQuiz[0]?.at,
      progress: perfectQuiz.length > 0 ? 100 : Math.max(...log.quizzes.map((q) => q.pct), 0),
    },
    {
      id: "night-owl",
      title: "Night Owl",
      description: "Complete a lesson after midnight",
      icon: "Moon",
      xp: 75,
      earned: nightOwl.length >= 1,
      earnedAt: nightOwl[0],
      progress: nightOwl.length > 0 ? 100 : 0,
    },
    {
      id: "deep-diver",
      title: "Deep Diver",
      description: "Study for 5 hours in total",
      icon: "Timer",
      xp: 250,
      earned: minutes >= 300,
      progress: pct(minutes, 300),
    },
    {
      id: "course-conqueror",
      title: "Course Conqueror",
      description: "Complete your first full course",
      icon: "Trophy",
      xp: 500,
      earned: finished.length >= 1,
      earnedAt: finished[0]?.lastWatchedAt,
      progress: Math.max(...enrollments.map((e) => e.progress), 0),
    },
    {
      id: "mushaira-star",
      title: "Mushaira Star",
      description: "Attend a live class or mushaira",
      icon: "Star",
      xp: 300,
      earned: liveJoined.length >= 1,
      earnedAt: liveJoined[0],
      progress: liveJoined.length > 0 ? 100 : 0,
    },
    {
      id: "marathon-mind",
      title: "Marathon Mind",
      description: "Maintain a 30-day streak",
      icon: "Medal",
      xp: 750,
      earned: streak >= 30,
      progress: pct(streak, 30),
    },
    {
      id: "beacon-knowledge",
      title: "Beacon of Knowledge",
      description: "Reach Level 10 — Lighthouse Keeper",
      icon: "Lightbulb",
      xp: 1000,
      earned: level >= 10,
      progress: pct(level, 10),
    },
  ];
}
