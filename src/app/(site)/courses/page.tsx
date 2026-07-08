import type { Metadata } from "next";
import { Suspense } from "react";
import { CourseExplorer } from "@/components/course/course-explorer";

export const metadata: Metadata = {
  title: "Explore Courses",
  description:
    "Browse premium Urdu, English, and Persian courses — script, conversation, poetry, grammar, IELTS, and calligraphy — taught by India's finest teachers.",
};

export default function CoursesPage() {
  return (
    <div className="container-lh py-10 sm:py-14">
      <div className="max-w-2xl">
        <p className="eyebrow">Course library</p>
        <h1 className="section-title mt-4">Explore every course</h1>
        <p className="mt-3 text-base muted sm:text-lg">
          Urdu, English, and Persian — filter by discipline, level, or price, or just search for
          what's on your mind.
        </p>
      </div>
      <Suspense fallback={<ExplorerSkeleton />}>
        <CourseExplorer />
      </Suspense>
    </div>
  );
}

function ExplorerSkeleton() {
  return (
    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <div className="skeleton aspect-video !rounded-none" />
          <div className="space-y-3 p-5">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-5 w-4/5" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-8 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}
