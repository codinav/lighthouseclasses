"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Award, CalendarClock, Check, Clock, GraduationCap, Languages, PlayCircle, Users } from "lucide-react";
import type { Course } from "@/lib/types";
import { courseDurationMin, getTeacher, lessonCount } from "@/lib/data";
import { fetchMergedCourses, learnHref } from "@/lib/courses";
import { findTeacherMerged } from "@/lib/teachers";
import { formatHoursMin } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Reveal } from "@/components/ui/reveal";
import { Accordion } from "@/components/ui/accordion";
import { Curriculum } from "@/components/course/curriculum";
import { EnrollCard } from "@/components/course/enroll-card";
import { CourseCard } from "@/components/course/course-card";
import { TrailerButton } from "@/components/course/trailer-button";

interface TeacherView {
  slug: string;
  name: string;
  title: string;
  gradient: string;
  longBio: string;
  rating: number;
  students: number;
  courseCount: number;
  custom?: boolean;
}

export function CourseDetail({ course }: { course: Course }) {
  const [teacher, setTeacher] = useState<TeacherView | null>(getTeacher(course.teacherId) ?? null);
  const [related, setRelated] = useState<Course[]>([]);
  useEffect(() => {
    void fetchMergedCourses().then((all) =>
      setRelated(all.filter((c) => c.category === course.category && c.slug !== course.slug).slice(0, 3))
    );
  }, [course.category, course.slug]);

  useEffect(() => {
    if (teacher) return;
    void findTeacherMerged(course.teacherId).then((t) => {
      if (t) setTeacher({ ...t, custom: t.custom });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.teacherId]);

  const META = [
    { icon: Clock, label: `${formatHoursMin(courseDurationMin(course))} of video` },
    { icon: PlayCircle, label: `${lessonCount(course)} lessons` },
    { icon: GraduationCap, label: course.level },
    { icon: Languages, label: course.language },
    { icon: Award, label: "Certificate" },
    { icon: CalendarClock, label: `Updated ${new Date(course.updatedAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}` },
  ];

  const teacherLink = teacher ? (teacher.custom ? `/teachers/profile?slug=${teacher.slug}` : `/teachers/${teacher.slug}`) : "#";

  return (
    <article>
      {/* Hero band */}
      <div className="bg-navy-950 pb-24 pt-10 text-white sm:pb-28 sm:pt-14">
        <div className="container-lh">
          <nav aria-label="Breadcrumb" className="text-xs text-white/50">
            <Link href="/courses" className="hover:text-white">Courses</Link>
            <span aria-hidden> / </span>
            <Link href={`/courses?category=${encodeURIComponent(course.category)}`} className="hover:text-white">
              {course.category}
            </Link>
          </nav>

          <div className="mt-6 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <div className="flex flex-wrap gap-2">
                {course.isBestseller && (
                  <span className="rounded-full bg-gold-400 px-3 py-1 text-2xs font-bold uppercase tracking-wide text-navy-950">Bestseller</span>
                )}
                {course.isNew && (
                  <span className="rounded-full bg-emerald-500 px-3 py-1 text-2xs font-bold uppercase tracking-wide text-white">New</span>
                )}
                {course.tags.map((t) => (
                  <span key={t} className="rounded-full border border-white/20 px-3 py-1 text-2xs font-semibold text-white/70">{t}</span>
                ))}
              </div>
              <h1 className="mt-4 animate-fade-up font-display text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
                {course.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base text-white/70 sm:text-lg">{course.subtitle}</p>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/80">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4" aria-hidden /> {course.level}
                </span>
                <span>{course.language}</span>
              </div>

              {teacher && (
                <Link href={teacherLink} className="mt-6 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 py-2 pl-2 pr-5 transition-colors hover:border-gold-400/50 hover:bg-white/10">
                  <Avatar name={teacher.name} gradient={teacher.gradient} className="h-9 w-9 text-xs" />
                  <span className="text-left">
                    <span className="block text-sm font-semibold">{teacher.name}</span>
                    <span className="block text-xs text-white/55">{teacher.title}</span>
                  </span>
                </Link>
              )}
            </div>

            <TrailerButton course={course} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="container-lh -mt-14 grid gap-8 pb-16 lg:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 space-y-12">
          <Reveal className="card grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 sm:p-6">
            {META.map((m) => (
              <span key={m.label} className="inline-flex items-center gap-2 text-sm font-medium">
                <m.icon className="h-4 w-4 shrink-0 text-ocean-600 dark:text-gold-400" aria-hidden /> {m.label}
              </span>
            ))}
          </Reveal>

          {course.outcomes.length > 0 && (
            <Reveal as="section">
              <h2 className="font-display text-2xl font-semibold">What you'll learn</h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {course.outcomes.map((o) => (
                  <li key={o} className="flex items-start gap-3 rounded-2xl border bg-[var(--lh-card)] p-4 text-sm leading-relaxed">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                    {o}
                  </li>
                ))}
              </ul>
            </Reveal>
          )}

          <Reveal as="section">
            <h2 className="font-display text-2xl font-semibold">Course curriculum</h2>
            <p className="mt-2 text-sm muted">
              {course.modules.length} modules · {lessonCount(course)} lessons · {formatHoursMin(courseDurationMin(course))}. Green lessons are free previews.
            </p>
            <div className="mt-5">
              <Curriculum course={course} />
            </div>
          </Reveal>

          <Reveal as="section">
            <h2 className="font-display text-2xl font-semibold">About this course</h2>
            <p className="mt-4 leading-relaxed muted">{course.description}</p>
            {course.requirements.length > 0 && (
              <>
                <h3 className="mt-6 font-semibold">Requirements</h3>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm muted">
                  {course.requirements.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </>
            )}
          </Reveal>

          {teacher && (
            <Reveal as="section" className="card p-6 sm:p-8">
              <p className="eyebrow">Your teacher</p>
              <div className="mt-5 flex flex-col gap-5 sm:flex-row">
                <Avatar name={teacher.name} gradient={teacher.gradient} className="h-20 w-20 text-2xl" />
                <div>
                  <h2 className="font-display text-xl font-semibold">{teacher.name}</h2>
                  <p className="text-sm muted">{teacher.title}</p>
                  <p className="mt-3 text-sm leading-relaxed muted">{teacher.longBio}</p>
                  <Link href={teacherLink} className="mt-4 inline-block text-sm font-semibold text-ocean-600 hover:underline dark:text-gold-400">
                    View full profile →
                  </Link>
                </div>
              </div>
            </Reveal>
          )}

          <Reveal as="section">
            <h2 className="font-display text-2xl font-semibold">Frequently asked</h2>
            <div className="mt-5">
              <Accordion
                defaultOpen={null}
                items={[
                  { title: "How long do I have access?", content: "Forever. One purchase gives you lifetime access to all lessons, future updates, and the course community." },
                  { title: "Is the certificate recognised?", content: "Yes — every certificate carries a unique verification ID that anyone can validate on our public verification page." },
                  { title: "Can I ask doubts?", content: "Every lesson has a Q&A thread answered by teaching assistants within 24 hours. Members also get access to weekly live doubt clinics." },
                ]}
              />
            </div>
          </Reveal>
        </div>

        <aside className="lg:relative">
          <div className="lg:sticky lg:top-24">
            <Reveal delay={100}>
              <EnrollCard course={course} />
            </Reveal>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="container-lh pb-20">
          <h2 className="font-display text-2xl font-semibold">More in {course.category}</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((c) => (
              <CourseCard key={c.slug} course={c} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
