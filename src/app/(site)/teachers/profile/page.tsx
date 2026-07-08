"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Award, GraduationCap, Loader2, Star, Users } from "lucide-react";
import { fetchAllTeachersAdmin, type MergedTeacher } from "@/lib/teachers";
import { getCoursesByTeacher } from "@/lib/data";
import { formatCompact } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { CourseCard } from "@/components/course/course-card";

/** Profile route for admin-created teachers: /teachers/profile?slug=… */
export default function TeacherProfileByQueryPage() {
  return (
    <Suspense>
      <ProfileResolver />
    </Suspense>
  );
}

function ProfileResolver() {
  const slug = useSearchParams().get("slug") ?? "";
  const [teacher, setTeacher] = useState<MergedTeacher | null | undefined>(undefined);

  useEffect(() => {
    if (!slug) {
      setTeacher(null);
      return;
    }
    let cancelled = false;
    void fetchAllTeachersAdmin().then((all) => {
      if (!cancelled) setTeacher(all.find((t) => t.slug === slug && !t.hidden) ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (teacher === undefined) {
    return (
      <div className="container-lh flex min-h-[50vh] items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-ocean-600" aria-label="Loading profile" />
      </div>
    );
  }

  if (teacher === null) {
    return (
      <div className="container-lh py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Teacher not found</h1>
        <Link href="/teachers" className="btn-primary btn-md mt-6">All teachers</Link>
      </div>
    );
  }

  const courses = getCoursesByTeacher(teacher.id);

  const STATS = [
    { icon: Star, value: teacher.rating.toFixed(1), label: "Instructor rating" },
    { icon: Users, value: teacher.students > 0 ? formatCompact(teacher.students) : "New", label: "Students taught" },
    { icon: GraduationCap, value: String(Math.max(courses.length, teacher.courseCount)), label: "Courses" },
    { icon: Award, value: "Top 2%", label: "Faculty selection" },
  ];

  return (
    <div>
      <div className="bg-navy-950 pb-20 pt-12 text-white">
        <div className="container-lh">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <Avatar name={teacher.name} gradient={teacher.gradient} className="h-28 w-28 text-4xl ring-4 ring-gold-400/40" />
            <div>
              <p className="eyebrow">Lighthouse faculty</p>
              <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">{teacher.name}</h1>
              <p className="mt-1 text-white/60">{teacher.title}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {teacher.specialties.map((s) => (
                  <span key={s} className="rounded-full border border-white/20 px-3 py-1 text-2xs font-semibold text-white/75">{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-lh -mt-10 pb-16">
        <div className="card grid grid-cols-2 gap-6 p-6 sm:grid-cols-4 sm:p-8">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <s.icon className="mx-auto h-5 w-5 text-gold-500" aria-hidden />
              <p className="mt-2 font-display text-2xl font-bold">{s.value}</p>
              <p className="text-2xs uppercase tracking-widest muted">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 max-w-3xl">
          <h2 className="font-display text-2xl font-semibold">About</h2>
          <p className="mt-3 leading-relaxed muted">{teacher.longBio}</p>
        </div>

        {courses.length > 0 ? (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-semibold">Courses by {teacher.name.split(" ")[0]}</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((c) => (
                <CourseCard key={c.slug} course={c} />
              ))}
            </div>
          </section>
        ) : (
          <p className="card mt-12 border-dashed p-8 text-center text-sm muted">
            {teacher.name.split(" ")[0]} teaches live classes — check the{" "}
            <Link href="/live" className="font-semibold text-ocean-600 hover:underline dark:text-gold-400">schedule</Link>.
          </p>
        )}
      </div>
    </div>
  );
}
