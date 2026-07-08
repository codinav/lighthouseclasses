"use client";

import { useEffect, useState } from "react";
import { PlayCircle, X } from "lucide-react";
import type { Course } from "@/lib/types";
import { CourseCover } from "@/components/ui/course-cover";

/** First real lesson video, if any — no sample/demo fallbacks. */
function trailerSrc(course: Course): string {
  for (const m of course.modules) for (const l of m.lessons) if (l.videoUrl) return l.videoUrl;
  return "";
}

/**
 * Public course trailer: cover art that opens a modal video player.
 * Renders as plain cover art when the course has no uploaded video yet.
 */
export function TrailerButton({ course }: { course: Course }) {
  const [open, setOpen] = useState(false);
  const src = trailerSrc(course);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => src && setOpen(true)}
        aria-label={`Play the free trailer for ${course.title}`}
        className="group relative block w-full self-start overflow-hidden rounded-3xl border border-white/15 text-left shadow-lifted"
      >
        <CourseCover gradient={course.gradient} icon={course.icon} thumbnail={course.thumbnail} className="aspect-video" />
        {src && (
          <>
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-navy-900 shadow-lifted transition-transform duration-300 group-hover:scale-110">
                <span className="absolute inset-0 animate-pulse-ring rounded-full border-2 border-white" aria-hidden />
                <PlayCircle className="h-8 w-8" aria-hidden />
              </span>
            </span>
            <span className="absolute bottom-3 left-3 rounded-full bg-navy-950/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              ▶ Watch trailer — free
            </span>
          </>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label={`${course.title} trailer`}
        >
          <div className="absolute inset-0 bg-navy-950/90 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-4xl animate-scale-in">
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="truncate font-display text-lg font-semibold text-white">
                {course.title} — Trailer
              </p>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close trailer"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <video
              src={src}
              controls
              autoPlay
              playsInline
              className="aspect-video w-full rounded-2xl bg-black shadow-lifted"
            />
            <p className="mt-3 text-center text-xs text-white/50">Press Esc to close</p>
          </div>
        </div>
      )}
    </>
  );
}
