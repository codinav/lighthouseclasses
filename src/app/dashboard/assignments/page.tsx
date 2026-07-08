"use client";

import Link from "next/link";
import { ClipboardList, GraduationCap, Sparkles, Trophy } from "lucide-react";
import { QUIZZES, getCourse } from "@/lib/data";
import { readActivity, type QuizAttempt } from "@/lib/activity";
import { useAuth } from "@/lib/providers";
import { useEnrollments } from "@/lib/use-enrollments";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export default function AssignmentsPage() {
  const { user } = useAuth();
  const { enrollments, loading } = useEnrollments();
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);

  useEffect(() => {
    if (user?.email) setAttempts(readActivity(user.email).quizzes);
  }, [user?.email]);

  // Quizzes for the courses the learner is enrolled in (else all quizzes)
  const items = useMemo(() => {
    const enrolledSlugs = new Set(enrollments.map((e) => e.courseSlug));
    const relevant = enrollments.length > 0 ? QUIZZES.filter((q) => enrolledSlugs.has(q.courseSlug)) : QUIZZES;
    return relevant.map((q) => {
      const mine = attempts.filter((a) => a.quizId === q.id);
      const best = mine.length > 0 ? Math.max(...mine.map((a) => a.pct)) : null;
      return { quiz: q, course: getCourse(q.courseSlug), best, tries: mine.length };
    });
  }, [enrollments, attempts]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">Assignments & quizzes</h1>
      <p className="mt-1 text-sm muted">Practice quizzes for your courses. Every attempt earns real XP — 100% unlocks a badge.</p>

      {!loading && items.length === 0 && (
        <div className="card mt-6 flex flex-col items-center gap-3 border-dashed p-12 text-center">
          <ClipboardList className="h-9 w-9 muted" aria-hidden />
          <h2 className="font-display text-xl font-semibold">No assignments yet</h2>
          <p className="max-w-sm text-sm muted">
            Enroll in a course and its quizzes and practice tasks appear here, ready to attempt.
          </p>
          <Link href="/courses" className="btn-gold btn-md mt-1">Browse courses</Link>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {items.map(({ quiz, course, best, tries }) => {
          const done = best !== null;
          const meta = done
            ? { label: `Best ${best}%`, icon: GraduationCap, cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" }
            : { label: "Not attempted", icon: ClipboardList, cls: "bg-gold-400/15 text-gold-600 dark:text-gold-300" };
          return (
            <div key={quiz.id} className="card card-hover flex flex-wrap items-center gap-4 p-5">
              <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", meta.cls)}>
                <meta.icon className="h-6 w-6" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{quiz.title}</p>
                <p className="truncate text-xs muted">{course?.title ?? quiz.courseSlug}</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-xs muted">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  {quiz.questions.length} questions · {quiz.durationMin} min · up to +{quiz.xp} XP
                  {tries > 0 && ` · ${tries} ${tries === 1 ? "attempt" : "attempts"}`}
                </p>
              </div>
              {best === 100 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gold-400/15 px-2.5 py-1 text-2xs font-bold text-gold-600 dark:text-gold-300">
                  <Trophy className="h-3.5 w-3.5" aria-hidden /> Perfect
                </span>
              )}
              <span className={cn("rounded-full px-3 py-1 text-2xs font-bold uppercase tracking-wider", meta.cls)}>{meta.label}</span>
              <Link href={`/quiz/${quiz.id}`} className="btn-primary btn-sm">
                {done ? "Retake" : "Start now"}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
