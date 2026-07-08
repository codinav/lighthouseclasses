/**
 * Enrollment store — local-first with cloud sync.
 *
 * Buying (or starting) a course writes to localStorage immediately, so
 * "My Courses" updates the instant a purchase completes — no backend
 * required. Every write is mirrored to Supabase when configured/tables
 * exist, and reads merge both sources (freshest record per course wins),
 * giving cross-device sync without ever blocking the UX on it.
 */
import { courseDurationMin, getCourse } from "./data";
import { findCourseMerged } from "./courses";
import {
  fetchEnrollments as dbFetchEnrollments,
  recordEnrollment as dbRecordEnrollment,
  updateEnrollmentProgress as dbUpdateEnrollmentProgress,
} from "./db";
import type { Enrollment } from "./progress";

export type EnrollSource = "purchase" | "subscription" | "watch";

interface LocalEnrollment {
  courseSlug: string;
  source: EnrollSource;
  progress: number;
  lastLessonId: string;
  lastLessonTitle: string;
  updatedAt: string; // ISO
  createdAt: string;
}

const key = (email: string) => `lh_enrollments_${email.toLowerCase()}`;

function readLocal(email: string): LocalEnrollment[] {
  try {
    return JSON.parse(localStorage.getItem(key(email)) ?? "[]") as LocalEnrollment[];
  } catch {
    return [];
  }
}

function writeLocal(email: string, rows: LocalEnrollment[]) {
  try {
    localStorage.setItem(key(email), JSON.stringify(rows));
  } catch {}
}

/** Enroll in a course (idempotent — a purchase upgrades a "watch" record). */
export function enroll(email: string, courseSlug: string, source: EnrollSource) {
  const rows = readLocal(email);
  const now = new Date().toISOString();
  const existing = rows.find((r) => r.courseSlug === courseSlug);
  if (existing) {
    if (existing.source === "watch" && source !== "watch") existing.source = source;
    existing.updatedAt = now;
  } else {
    rows.unshift({
      courseSlug,
      source,
      progress: 0,
      lastLessonId: "",
      lastLessonTitle: "Start from the beginning",
      updatedAt: now,
      createdAt: now,
    });
  }
  writeLocal(email, rows);
  void dbRecordEnrollment(email, courseSlug, source); // cloud mirror (no-op until tables exist)
}

export function isEnrolled(email: string, courseSlug: string): boolean {
  return readLocal(email).some((r) => r.courseSlug === courseSlug);
}

/** Update progress/resume point for a course (local + cloud). Upserts. */
export function updateProgress(
  email: string,
  courseSlug: string,
  progress: number,
  lastLessonId: string,
  lastLessonTitle: string
) {
  const rows = readLocal(email);
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  const now = new Date().toISOString();
  let row = rows.find((r) => r.courseSlug === courseSlug);
  if (!row) {
    // self-healing: progress before an explicit enroll still creates the record
    row = {
      courseSlug,
      source: "watch",
      progress: 0,
      lastLessonId: "",
      lastLessonTitle: "Start from the beginning",
      updatedAt: now,
      createdAt: now,
    };
    rows.unshift(row);
  }
  row.progress = Math.max(row.progress, pct);
  row.lastLessonId = lastLessonId;
  row.lastLessonTitle = lastLessonTitle;
  row.updatedAt = now;
  writeLocal(email, rows);
  void dbUpdateEnrollmentProgress(email, courseSlug, Math.max(row.progress, pct), lastLessonId, lastLessonTitle);
}

/** Merged view: local + Supabase, freshest record per course wins. */
export async function fetchMergedEnrollments(email: string): Promise<Enrollment[]> {
  const local = readLocal(email);
  const remote = await dbFetchEnrollments(email);

  const bySlug = new Map<string, { progress: number; lastLessonId: string; lastLessonTitle: string; updatedAt: string }>();
  for (const r of local) {
    bySlug.set(r.courseSlug, {
      progress: r.progress,
      lastLessonId: r.lastLessonId,
      lastLessonTitle: r.lastLessonTitle,
      updatedAt: r.updatedAt,
    });
  }
  for (const r of remote) {
    const cur = bySlug.get(r.course_slug);
    if (!cur || new Date(r.updated_at).getTime() > new Date(cur.updatedAt).getTime()) {
      bySlug.set(r.course_slug, {
        progress: Math.max(cur?.progress ?? 0, r.progress),
        lastLessonId: r.last_lesson_id ?? cur?.lastLessonId ?? "",
        lastLessonTitle: r.last_lesson_title ?? cur?.lastLessonTitle ?? "Start from the beginning",
        updatedAt: r.updated_at,
      });
    }
  }

  const merged: Enrollment[] = [];
  for (const [slug, v] of Array.from(bySlug.entries())) {
    // static catalog first, then admin-created courses
    const course = getCourse(slug) ?? (await findCourseMerged(slug));
    if (!course) continue;
    merged.push({
      courseSlug: slug,
      progress: v.progress,
      lastLessonTitle: v.lastLessonTitle,
      lastLessonId: v.lastLessonId,
      lastWatchedAt: v.updatedAt,
      // Time left computed from the REAL sum of lesson durations
      timeLeftMin: Math.max(0, Math.round(courseDurationMin(course) * (1 - v.progress / 100))),
    });
  }
  merged.sort((a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime());
  return merged;
}
