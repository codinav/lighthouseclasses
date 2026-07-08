/**
 * Course catalog — entirely admin-created (Supabase). The old built-in
 * demo catalog is gone; every course is managed from /admin/courses.
 */
import { fetchCustomCourses, type CustomCourseRow } from "./db";
import type { Course, Lesson, Module } from "./types";

const GRADIENTS = [
  "from-ocean-600 via-navy-700 to-navy-900",
  "from-rose-500 via-rose-700 to-navy-900",
  "from-emerald-500 via-teal-700 to-navy-900",
  "from-violet-500 via-indigo-700 to-navy-900",
  "from-amber-500 via-orange-700 to-navy-900",
  "from-cyan-500 via-sky-700 to-navy-900",
];

export function pickCourseGradient(i: number) {
  return GRADIENTS[i % GRADIENTS.length];
}

export function rowToCourse(r: CustomCourseRow): Course {
  const modules: Module[] = r.modules_json.map((m, mi) => ({
    id: `m${mi + 1}`,
    title: m.title,
    lessons: m.lessons.map(
      (l, li): Lesson => ({
        id: `l${mi + 1}-${li + 1}`,
        title: l.title,
        type: l.type ?? "video",
        durationSec: Math.max(1, Math.round(l.durationMin * 60)),
        free: l.free,
        videoUrl: l.videoUrl || undefined,
      })
    ),
  }));
  return {
    id: r.slug,
    slug: r.slug,
    title: r.title,
    subtitle: r.subtitle,
    category: r.category,
    level: (r.level as Course["level"]) || "All Levels",
    language: r.language || "English",
    price: r.price,
    originalPrice: r.original_price > r.price ? r.original_price : Math.round(r.price * 1.8),
    rating: 5.0,
    ratingCount: 0,
    students: 0,
    durationHours: Math.max(1, Math.round(modules.reduce((n, m) => n + m.lessons.reduce((s, l) => s + l.durationSec, 0), 0) / 3600)),
    teacherId: r.teacher_id,
    description: r.description,
    outcomes: r.outcomes.split("\n").map((s) => s.trim()).filter(Boolean),
    requirements: [],
    includes: r.includes.split("\n").map((s) => s.trim()).filter(Boolean),
    modules,
    tags: [r.category],
    gradient: r.gradient || GRADIENTS[0],
    icon: r.icon || "BookOpen",
    thumbnail: r.thumbnail || undefined,
    isNew: true,
    hasCertificate: true,
    featured: !!r.featured,
    updatedAt: (r.created_at ?? new Date().toISOString()).slice(0, 10),
    custom: true,
  };
}

let cache: Course[] | null = null;

export function invalidateCourses() {
  cache = null;
}

/** Full catalog for browsing: every visible admin-created course. */
export async function fetchMergedCourses(): Promise<Course[]> {
  if (cache) return cache;
  const customRows = await fetchCustomCourses();
  cache = customRows.filter((r) => !r.hidden).map(rowToCourse);
  return cache;
}

/** Resolve a course by slug, regardless of visibility. */
export async function findCourseMerged(slug: string): Promise<Course | null> {
  const rows = await fetchCustomCourses();
  const row = rows.find((r) => r.slug === slug);
  return row ? rowToCourse(row) : null;
}

/* ------------------------------- hrefs ------------------------------- */

export function courseHref(course: Pick<Course, "slug" | "custom">): string {
  return `/courses/view?slug=${course.slug}`;
}

export function learnHref(course: Pick<Course, "slug" | "custom">, lessonId?: string): string {
  return `/learn/view?slug=${course.slug}${lessonId ? `&lesson=${lessonId}` : ""}`;
}
