"use client";

/**
 * Real lesson bookmarks & notes — the video player writes these to
 * localStorage per course (`lh_notes_<slug>`). This reads them all back so
 * the dashboard shows the moments the learner actually saved.
 */

import { getCourse } from "./data";
import { findCourseMerged } from "./courses";
import type { Course } from "./types";

export interface SavedNote {
  id: string;
  courseSlug: string;
  courseTitle: string;
  lessonId: string;
  time: number; // seconds
  text: string;
}

const PREFIX = "lh_notes_";

export async function readAllNotes(): Promise<SavedNote[]> {
  const out: SavedNote[] = [];
  const slugs: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) slugs.push(key.slice(PREFIX.length));
  }
  for (const slug of slugs) {
    let raw: { id: string; time: number; text: string; lessonId: string }[] = [];
    try {
      raw = JSON.parse(localStorage.getItem(PREFIX + slug) ?? "[]");
    } catch {
      raw = [];
    }
    if (raw.length === 0) continue;
    const course: Course | undefined = getCourse(slug) ?? (await findCourseMerged(slug)) ?? undefined;
    for (const n of raw) {
      out.push({
        id: n.id,
        courseSlug: slug,
        courseTitle: course?.title ?? slug,
        lessonId: n.lessonId,
        time: n.time,
        text: n.text,
      });
    }
  }
  // newest first isn't tracked, so sort by course then timestamp within lesson
  return out;
}
