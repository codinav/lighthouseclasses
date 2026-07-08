"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Clock, PlayCircle } from "lucide-react";
import type { Course } from "@/lib/types";
import { courseDurationMin, lessonCount } from "@/lib/data";
import { fetchVisibleTeachers } from "@/lib/teachers";
import { courseHref } from "@/lib/courses";
import { cn, formatHoursMin, formatINR } from "@/lib/utils";
import { CourseCover } from "@/components/ui/course-cover";
import { Avatar } from "@/components/ui/avatar";

export function CourseCard({ course, className }: { course: Course; className?: string }) {
  const [teacher, setTeacher] = useState<{ name: string; gradient: string } | null>(null);
  useEffect(() => {
    void fetchVisibleTeachers().then((all) => {
      const t = all.find((x) => x.id === course.teacherId);
      if (t) setTeacher({ name: t.name, gradient: t.gradient });
    });
  }, [course.teacherId]);
  const discount = Math.round((1 - course.price / course.originalPrice) * 100);

  return (
    <Link
      href={courseHref(course)}
      className={cn("card card-hover group flex flex-col overflow-hidden", className)}
    >
      <div className="relative">
        <CourseCover gradient={course.gradient} icon={course.icon} thumbnail={course.thumbnail} title={course.title} className="aspect-video" />
        <div className="absolute left-3 top-3 flex gap-2">
          {course.isBestseller && (
            <span className="rounded-full bg-gold-400 px-2.5 py-1 text-2xs font-bold uppercase tracking-wide text-navy-950 shadow-soft">
              Bestseller
            </span>
          )}
          {course.isNew && (
            <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-2xs font-bold uppercase tracking-wide text-white shadow-soft">
              New
            </span>
          )}
        </div>
        <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-navy-950/70 px-2.5 py-1 text-2xs font-semibold text-white backdrop-blur">
          <Clock className="h-3 w-3" aria-hidden /> {formatHoursMin(courseDurationMin(course))}
        </span>
        {/* Hover play affordance */}
        <span className="absolute inset-0 flex items-center justify-center bg-navy-950/0 opacity-0 transition-all duration-300 group-hover:bg-navy-950/30 group-hover:opacity-100">
          <PlayCircle className="h-12 w-12 text-white drop-shadow-lg" aria-hidden />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="text-2xs font-bold uppercase tracking-[0.16em] text-ocean-600 dark:text-ocean-300">
          {course.category} · {course.level}
        </p>
        <h3 className="mt-1.5 font-display text-lg font-semibold leading-snug transition-colors group-hover:text-ocean-600 dark:group-hover:text-gold-400">
          {course.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm muted">{course.subtitle}</p>

        <div className="mt-3 flex items-center gap-2">
          {teacher && (
            <>
              <Avatar name={teacher.name} gradient={teacher.gradient} className="h-6 w-6 text-2xs" />
              <span className="truncate text-xs font-medium muted">{teacher.name}</span>
            </>
          )}
        </div>

        <div className="mt-4 flex items-baseline gap-2 border-t pt-4">
          <span className="font-display text-xl font-bold">{formatINR(course.price)}</span>
          <span className="text-xs line-through muted">{formatINR(course.originalPrice)}</span>
          <span className="ml-auto rounded-full bg-emerald-500/10 px-2 py-0.5 text-2xs font-bold text-emerald-600 dark:text-emerald-400">
            {discount}% off
          </span>
        </div>
        <p className="mt-2 text-2xs muted">{lessonCount(course)} lessons · Certificate included</p>
      </div>
    </Link>
  );
}
