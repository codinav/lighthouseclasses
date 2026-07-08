"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bookmark, Heart, Play } from "lucide-react";
import { getCourse } from "@/lib/data";
import { fetchMergedCourses, learnHref } from "@/lib/courses";
import { readAllNotes, type SavedNote } from "@/lib/bookmarks";
import { formatDuration } from "@/lib/utils";
import type { Course } from "@/lib/types";
import { CourseCard } from "@/components/course/course-card";

export default function WishlistPage() {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<Course[]>([]);
  const [notes, setNotes] = useState<SavedNote[] | null>(null);

  useEffect(() => {
    try {
      setSlugs(JSON.parse(localStorage.getItem("lh_wishlist") ?? "[]"));
    } catch {}
    void fetchMergedCourses().then(setCatalog);
    void readAllNotes().then(setNotes);
  }, []);

  const wishlist = catalog.filter((c) => slugs.includes(c.slug));

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">Wishlist & bookmarks</h1>
      <p className="mt-1 text-sm muted">Courses you're eyeing and moments you saved inside lessons.</p>

      <h2 className="mt-8 flex items-center gap-2 font-display text-xl font-semibold">
        <Heart className="h-5 w-5 text-rose-500" aria-hidden /> Wishlisted courses
      </h2>
      {wishlist.length > 0 ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {wishlist.map((c) => (
            <CourseCard key={c.slug} course={c} />
          ))}
        </div>
      ) : (
        <div className="card mt-4 border-dashed p-10 text-center">
          <Heart className="mx-auto h-8 w-8 muted" aria-hidden />
          <p className="mt-3 font-semibold">Your wishlist is empty</p>
          <p className="mx-auto mt-1 max-w-sm text-sm muted">
            Tap the heart on any course page and it'll wait for you here.
          </p>
          <Link href="/courses" className="btn-ocean btn-md mt-4">
            Browse courses
          </Link>
        </div>
      )}

      <h2 className="mt-12 flex items-center gap-2 font-display text-xl font-semibold">
        <Bookmark className="h-5 w-5 text-ocean-600 dark:text-gold-400" aria-hidden /> Lesson bookmarks
      </h2>
      {notes === null ? (
        <div className="mt-4 space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton h-16 w-full" />
          ))}
        </div>
      ) : notes.length > 0 ? (
        <div className="mt-4 space-y-3">
          {notes.map((b) => {
            const course = getCourse(b.courseSlug) ?? catalog.find((c) => c.slug === b.courseSlug);
            const href = course ? learnHref(course, b.lessonId || undefined) : `/learn/view?slug=${b.courseSlug}`;
            return (
              <Link key={b.id} href={href} className="card card-hover flex items-center gap-4 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ocean-600/10 font-mono text-xs font-bold text-ocean-600 dark:bg-gold-400/15 dark:text-gold-400">
                  {formatDuration(b.time)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{b.courseTitle}</p>
                  <p className="mt-0.5 truncate text-xs italic muted">“{b.text}”</p>
                </div>
                <Play className="h-5 w-5 shrink-0 text-ocean-600 dark:text-gold-400" aria-hidden />
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="card mt-4 border-dashed p-10 text-center">
          <Bookmark className="mx-auto h-8 w-8 muted" aria-hidden />
          <p className="mt-3 font-semibold">No bookmarks yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm muted">
            While watching a lesson, tap the bookmark button or jot a note — they'll collect here so
            you can jump straight back to the moment.
          </p>
        </div>
      )}
    </div>
  );
}
