"use client";

/**
 * Real certificates — earned by finishing a course (100% progress).
 * IDs are deterministic per learner + course, so a certificate keeps the
 * same verifiable number forever and can be re-checked on the verify page.
 */

import { courseDurationMin, getCourse } from "./data";
import type { Course } from "./types";
import type { Enrollment } from "./progress";

export interface EarnedCertificate {
  id: string;
  courseSlug: string;
  course: string;
  issued: string; // ISO
  hours: number;
}

/** Stable "LH-YYYY-XXXXXX" id derived from email + course. */
export function certificateId(email: string, courseSlug: string, issued: string): string {
  const input = `${email.toLowerCase()}|${courseSlug}`;
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  const code = h.toString(36).toUpperCase().padStart(6, "0").slice(-6);
  return `LH-${new Date(issued).getFullYear()}-${code}`;
}

export function certificatesFor(
  email: string,
  enrollments: Enrollment[],
  courseFor: (slug: string) => Course | undefined
): EarnedCertificate[] {
  return enrollments
    .filter((e) => e.progress >= 100)
    .map((e) => {
      const course = getCourse(e.courseSlug) ?? courseFor(e.courseSlug);
      if (!course) return null;
      return {
        id: certificateId(email, e.courseSlug, e.lastWatchedAt),
        courseSlug: e.courseSlug,
        course: course.title,
        issued: e.lastWatchedAt,
        hours: Math.max(1, Math.round(courseDurationMin(course) / 60)),
      };
    })
    .filter((c): c is EarnedCertificate => c !== null)
    .sort((a, b) => b.issued.localeCompare(a.issued));
}
