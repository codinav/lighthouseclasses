/**
 * Teacher directory — entirely admin-created (Supabase). The built-in demo
 * faculty is gone; every teacher is managed from /admin/teachers.
 */
import { fetchTeachersDb, type TeacherRowDb } from "./db";
import type { Teacher } from "./types";
import { slugify } from "./utils";

const GRADIENTS = [
  "from-ocean-500 to-navy-800",
  "from-rose-500 to-pink-800",
  "from-emerald-500 to-teal-800",
  "from-violet-500 to-indigo-800",
  "from-amber-500 to-orange-800",
  "from-cyan-500 to-sky-800",
];

export interface MergedTeacher extends Teacher {
  custom: boolean; // true = created in admin (no static profile page)
  hidden?: boolean;
}

function rowToTeacher(r: TeacherRowDb, custom = true): MergedTeacher {
  return {
    id: r.id,
    slug: r.slug || slugify(r.name),
    name: r.name,
    title: r.title,
    bio: r.bio,
    longBio: r.long_bio || r.bio,
    rating: 5.0,
    students: 0,
    courseCount: 0,
    specialties: r.specialties ? r.specialties.split(",").map((s) => s.trim()).filter(Boolean) : [],
    gradient: r.gradient || GRADIENTS[0],
    featured: r.featured,
    custom,
    hidden: r.hidden,
  };
}

let cache: MergedTeacher[] | null = null;

export function invalidateTeachers() {
  cache = null;
}

export function pickGradient(index: number) {
  return GRADIENTS[index % GRADIENTS.length];
}

/** All teachers — including hidden (for admin). */
export async function fetchAllTeachersAdmin(): Promise<MergedTeacher[]> {
  const rows = await fetchTeachersDb();
  return rows.map((r) => rowToTeacher(r, true));
}

/** Public directory: visible teachers only. */
export async function fetchVisibleTeachers(): Promise<MergedTeacher[]> {
  if (cache) return cache;
  const all = await fetchAllTeachersAdmin();
  cache = all.filter((t) => !t.hidden);
  return cache;
}

export async function findTeacherMerged(idOrSlug: string): Promise<MergedTeacher | null> {
  const all = await fetchAllTeachersAdmin();
  return all.find((t) => t.id === idOrSlug || t.slug === idOrSlug) ?? null;
}

/** Href for a teacher profile (all teachers are admin-created). */
export function teacherHref(t: Pick<MergedTeacher, "slug">): string {
  return `/teachers/profile?slug=${t.slug}`;
}
