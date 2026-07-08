"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchMergedEnrollments } from "./enrollments";
import { fetchMergedCourses } from "./courses";
import type { Course } from "./types";
import type { Enrollment } from "./progress";
import { useAuth } from "./providers";

/**
 * The signed-in user's real enrollments (local-first, cloud-merged).
 * `loading` is true only for the first read; an empty list is a genuine
 * "no courses yet" state — pages show a browse CTA, not demo data.
 */
export function useEnrollments(): {
  enrollments: Enrollment[];
  loading: boolean;
  refresh: () => void;
  courseFor: (slug: string) => Course | undefined;
} {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Map<string, Course>>(new Map());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!user) return;
    void Promise.all([fetchMergedEnrollments(user.email), fetchMergedCourses()]).then(([rows, catalog]) => {
      setEnrollments(rows);
      setCourses(new Map(catalog.map((c) => [c.slug, c])));
      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    refresh();
    // Stay fresh when returning from the player (tab focus / bfcache / visibility)
    const onWake = () => refresh();
    window.addEventListener("focus", onWake);
    window.addEventListener("pageshow", onWake);
    document.addEventListener("visibilitychange", onWake);
    return () => {
      window.removeEventListener("focus", onWake);
      window.removeEventListener("pageshow", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, [refresh]);

  const courseFor = useCallback((slug: string) => courses.get(slug), [courses]);

  return { enrollments, loading, refresh, courseFor };
}
