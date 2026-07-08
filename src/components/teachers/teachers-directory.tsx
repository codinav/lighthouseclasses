"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { fetchVisibleTeachers, teacherHref, type MergedTeacher } from "@/lib/teachers";
import { Avatar } from "@/components/ui/avatar";
import { Reveal } from "@/components/ui/reveal";

/** Public faculty grid — reflects admin edits, additions, and hidden teachers. */
export function TeachersDirectory() {
  const [teachers, setTeachers] = useState<MergedTeacher[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchVisibleTeachers().then((merged) => {
      if (!cancelled) setTeachers(merged);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (teachers !== null && teachers.length === 0) {
    return (
      <div className="card mt-10 p-10 text-center">
        <p className="font-semibold">Our faculty is being introduced soon.</p>
        <p className="mx-auto mt-1 max-w-md text-sm muted">
          Teachers are added from the admin panel — check back shortly to meet the ustads.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {teachers === null && [0, 1, 2].map((i) => <div key={i} className="skeleton h-64 rounded-3xl" />)}
      {(teachers ?? []).map((t, i) => (
        <Reveal key={t.id} delay={(i % 3) * 70}>
          <Link href={teacherHref(t)} className="card card-hover group flex h-full flex-col p-6">
            <Avatar name={t.name} gradient={t.gradient} className="h-16 w-16 text-xl" />
            <h2 className="mt-4 font-display text-xl font-semibold group-hover:text-ocean-600 dark:group-hover:text-gold-400">
              {t.name}
            </h2>
            <p className="mt-0.5 text-sm muted">{t.title}</p>
            <p className="mt-3 flex-1 text-sm leading-relaxed muted">{t.bio}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {t.specialties.slice(0, 3).map((s) => (
                <span key={s} className="chip !py-1 text-2xs">{s}</span>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t pt-4 text-xs">
              <span className="muted">{t.courseCount > 0 ? `${t.courseCount} course${t.courseCount === 1 ? "" : "s"}` : "Live classes"}</span>
              <span className="inline-flex items-center gap-1 font-semibold text-ocean-600 dark:text-gold-400">
                View profile <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </div>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}
