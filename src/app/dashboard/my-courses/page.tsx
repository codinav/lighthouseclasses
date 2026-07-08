"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Award, Play } from "lucide-react";
import { getCourse } from "@/lib/data";
import { learnHref } from "@/lib/courses";
import { fetchVisibleTeachers } from "@/lib/teachers";
import { formatHoursMin } from "@/lib/utils";
import { certificatesFor } from "@/lib/certificates";
import { useAuth } from "@/lib/providers";
import { useEnrollments } from "@/lib/use-enrollments";
import { CourseCover } from "@/components/ui/course-cover";
import { ProgressBar } from "@/components/ui/progress";

export default function MyCoursesPage() {
  const { user } = useAuth();
  const { enrollments, loading, courseFor } = useEnrollments();
  const [teacherName, setTeacherName] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    void fetchVisibleTeachers().then((all) => setTeacherName(new Map(all.map((t) => [t.id, t.name]))));
  }, []);
  const inProgress = enrollments.filter((e) => e.progress < 100);
  const certificates = certificatesFor(user?.email ?? "", enrollments, courseFor);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">My courses</h1>
      <p className="mt-1 text-sm muted">
        {inProgress.length} in progress · {certificates.length} completed
      </p>

      {!loading && enrollments.length === 0 && (
        <div className="card mt-6 flex flex-col items-center gap-3 border-dashed p-12 text-center">
          <Play className="h-9 w-9 muted" aria-hidden />
          <h2 className="font-display text-xl font-semibold">No courses yet</h2>
          <p className="max-w-sm text-sm muted">
            When you buy a course (or start a free preview), it lands here with your progress,
            resume point, and time remaining.
          </p>
          <Link href="/courses" className="btn-gold btn-md mt-1">Explore courses</Link>
        </div>
      )}

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {inProgress.map((e) => {
          const course = getCourse(e.courseSlug) ?? courseFor(e.courseSlug);
          if (!course) return null;

          return (
            <div key={e.courseSlug} className="card card-hover overflow-hidden">
              <CourseCover gradient={course.gradient} icon={course.icon} thumbnail={course.thumbnail} title={course.title} className="aspect-[3/1]" iconClassName="h-9 w-9" />
              <div className="p-5">
                <p className="text-2xs font-bold uppercase tracking-widest text-ocean-600 dark:text-ocean-300">{course.category}</p>
                <h2 className="mt-1 font-display text-lg font-semibold leading-snug">{course.title}</h2>
                <p className="mt-0.5 text-xs muted">{teacherName.get(course.teacherId) ?? ""}</p>
                <div className="mt-4 flex items-center gap-3">
                  <ProgressBar value={e.progress} className="flex-1" label={`${course.title} progress`} />
                  <span className="text-sm font-bold tabular-nums">{e.progress}%</span>
                </div>
                <p className="mt-1.5 text-xs muted">
                  Last watched {new Date(e.lastWatchedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {formatHoursMin(e.timeLeftMin)} left
                </p>
                <Link
                  href={learnHref(course, e.lastLessonId || undefined)}
                  className="btn-ocean btn-md mt-4 w-full"
                >
                  <Play className="h-4 w-4" aria-hidden />
                  {e.progress > 0 ? `Resume: ${e.lastLessonTitle.slice(0, 24)}…` : "Start course"}
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {certificates.length > 0 && (
        <>
          <h2 className="mt-12 font-display text-xl font-semibold">Completed</h2>
          <div className="mt-4 space-y-3">
            {certificates.map((cert) => (
              <div key={cert.id} className="card flex flex-wrap items-center gap-4 p-5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10">
                  <Award className="h-6 w-6 text-emerald-500" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{cert.course}</p>
                  <p className="text-xs muted">
                    Completed {new Date(cert.issued).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · {cert.hours} {cert.hours === 1 ? "hour" : "hours"} · {cert.id}
                  </p>
                </div>
                <Link href="/dashboard/certificates" className="btn-ghost btn-sm">
                  View certificate
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
