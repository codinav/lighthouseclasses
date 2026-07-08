"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Course } from "@/lib/types";
import { findCourseMerged } from "@/lib/courses";
import { CourseDetail } from "@/components/course/course-detail";

/** Detail route for admin-created courses: /courses/view?slug=… */
export default function CourseViewPage() {
  return (
    <Suspense>
      <Resolver />
    </Suspense>
  );
}

function Resolver() {
  const slug = useSearchParams().get("slug") ?? "";
  const [course, setCourse] = useState<Course | null | undefined>(undefined);

  useEffect(() => {
    if (!slug) {
      setCourse(null);
      return;
    }
    let cancelled = false;
    void findCourseMerged(slug).then((c) => {
      if (!cancelled) setCourse(c);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (course === undefined) {
    return (
      <div className="container-lh flex min-h-[50vh] items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-ocean-600" aria-label="Loading course" />
      </div>
    );
  }

  if (course === null) {
    return (
      <div className="container-lh py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Course not found</h1>
        <Link href="/courses" className="btn-primary btn-md mt-6">Browse courses</Link>
      </div>
    );
  }

  return <CourseDetail course={course} />;
}
