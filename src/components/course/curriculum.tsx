"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ClipboardList, FileQuestion, Lock, PlayCircle } from "lucide-react";
import type { Course } from "@/lib/types";
import { learnHref } from "@/lib/courses";
import { cn, formatDuration } from "@/lib/utils";

const TYPE_ICON = {
  video: PlayCircle,
  quiz: FileQuestion,
  assignment: ClipboardList,
  resource: ClipboardList,
};

export function Curriculum({ course }: { course: Course }) {
  const [open, setOpen] = useState<number[]>([0]);

  const toggle = (i: number) =>
    setOpen((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));

  return (
    <div className="overflow-hidden rounded-3xl border bg-[var(--lh-card)] shadow-soft">
      {course.modules.map((module, mi) => {
        const isOpen = open.includes(mi);
        const totalMin = Math.round(module.lessons.reduce((n, l) => n + l.durationSec, 0) / 60);
        return (
          <div key={module.id} className={cn(mi > 0 && "border-t")}>
            <button
              onClick={() => toggle(mi)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-4 px-5 py-4 text-left sm:px-6"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ocean-600/10 font-display text-sm font-bold text-ocean-600 dark:bg-gold-400/15 dark:text-gold-400">
                {String(mi + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{module.title}</span>
                <span className="text-xs muted">
                  {module.lessons.length} lessons · {totalMin} min
                </span>
              </span>
              <ChevronDown className={cn("h-5 w-5 shrink-0 muted transition-transform duration-300", isOpen && "rotate-180")} aria-hidden />
            </button>

            <div className={cn("grid transition-[grid-template-rows] duration-300", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
              <ul className="overflow-hidden">
                {module.lessons.map((lesson) => {
                  const Icon = TYPE_ICON[lesson.type];
                  const row = (
                    <>
                      <Icon
                        className={cn("h-4.5 w-4.5 h-[18px] w-[18px] shrink-0", lesson.free ? "text-emerald-500" : "text-ocean-600 dark:text-ocean-300")}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">{lesson.title}</span>
                      {lesson.free ? (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-2xs font-bold uppercase text-emerald-600 dark:text-emerald-400">
                          Preview
                        </span>
                      ) : (
                        <Lock className="h-3.5 w-3.5 shrink-0 muted" aria-hidden />
                      )}
                      <span className="w-12 shrink-0 text-right text-xs tabular-nums muted">
                        {formatDuration(lesson.durationSec)}
                      </span>
                    </>
                  );
                  return (
                    <li key={lesson.id} className="border-t border-dashed">
                      {lesson.free ? (
                        <Link
                          href={learnHref(course, lesson.id)}
                          className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-emerald-500/5 sm:px-6"
                        >
                          {row}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 px-5 py-3 sm:px-6">{row}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}
