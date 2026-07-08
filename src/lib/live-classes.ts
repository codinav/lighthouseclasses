/**
 * Live class schedule — entirely admin-created (Supabase). No demo schedule.
 */
import { fetchLiveClassesDb, type LiveClassRow } from "./db";
import type { LiveClass } from "./types";

export function rowToLiveClass(r: LiveClassRow): LiveClass {
  return {
    id: r.id,
    title: r.title,
    courseSlug: r.course_slug,
    teacherId: r.teacher_id,
    startsAt: r.starts_at,
    durationMin: r.duration_min,
    enrolled: r.enrolled ?? 0,
    level: (r.level as LiveClass["level"]) ?? "All Levels",
  };
}

/** All admin-scheduled classes. */
export async function fetchMergedLiveClasses(): Promise<{ classes: LiveClass[]; live: boolean }> {
  const rows = await fetchLiveClassesDb();
  return { classes: rows.map(rowToLiveClass), live: rows.length > 0 };
}

/** Resolve one class by id. */
export async function findLiveClass(id: string): Promise<LiveClass | null> {
  const rows = await fetchLiveClassesDb();
  const row = rows.find((r) => r.id === id);
  return row ? rowToLiveClass(row) : null;
}
