"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Course } from "@/lib/types";
import { findCourseMerged } from "@/lib/courses";
import { LearnRoom } from "@/components/player/learn-room";
import { AuthGate } from "@/components/auth/auth-gate";

/** Learning room for admin-created courses: /learn/view?slug=…&lesson=… */
export default function LearnViewPage() {
  return (
    <AuthGate>
      <Suspense>
        <Resolver />
      </Suspense>
    </AuthGate>
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
      <div className="flex min-h-screen items-center justify-center bg-navy-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-gold-400" aria-label="Loading course" />
      </div>
    );
  }

  if (course === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-navy-950 px-6 text-center text-white">
        <h1 className="font-display text-2xl font-semibold">Course not found</h1>
        <Link href="/courses" className="btn-gold btn-md mt-6">Browse courses</Link>
      </div>
    );
  }

  return <LearnRoom course={course} />;
}
