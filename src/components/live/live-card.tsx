"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, Clock, Radio } from "lucide-react";
import type { LiveClass } from "@/lib/types";
import { getTeacher } from "@/lib/data";
import { findTeacherMerged } from "@/lib/teachers";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function useCountdown(iso: string) {
  // `now` stays null until mount so the server and first client render agree
  // (a live clock would otherwise differ by a second → hydration mismatch).
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return { live: false, label: "—:—:—" };
  const diff = new Date(iso).getTime() - now;
  if (diff <= 0) return { live: true, label: "LIVE NOW" };
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const label = d > 0 ? `${d}d ${h}h ${m}m` : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return { live: false, label };
}

export function LiveClassCard({ lc, compact }: { lc: LiveClass; compact?: boolean }) {
  const [teacher, setTeacher] = useState<{ name: string; gradient: string } | null>(getTeacher(lc.teacherId) ?? null);
  const { live, label } = useCountdown(lc.startsAt);

  useEffect(() => {
    if (teacher) return;
    void findTeacherMerged(lc.teacherId).then((t) => {
      if (t) setTeacher({ name: t.name, gradient: t.gradient });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lc.teacherId]);
  const starts = new Date(lc.startsAt);

  return (
    <div className={cn("card card-hover flex flex-col p-5", compact ? "" : "sm:p-6")}>
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-bold uppercase tracking-wider",
            live ? "bg-rose-500 text-white" : "bg-ocean-600/10 text-ocean-600 dark:bg-gold-400/15 dark:text-gold-400"
          )}
        >
          <Radio className="h-3 w-3" aria-hidden />
          {live ? "Live now" : "Starts in"}
        </span>
        <span className={cn("font-mono text-sm font-bold tabular-nums", live ? "text-rose-500" : "")} aria-live="off">
          {live ? "●" : label}
        </span>
      </div>

      <h3 className="mt-3 font-display text-base font-semibold leading-snug sm:text-lg">{lc.title}</h3>

      <div className="mt-3 flex items-center gap-2.5">
        {teacher && (
          <>
            <Avatar name={teacher.name} gradient={teacher.gradient} className="h-8 w-8 text-xs" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{teacher.name}</p>
              <p className="text-2xs muted">{lc.level}</p>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t pt-4 text-xs muted">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          {starts.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden /> {lc.durationMin} min
        </span>
      </div>

      <Link
        href={`/live/room?id=${lc.id}`}
        className={cn("btn-md mt-4 w-full", live ? "btn-gold" : "btn-ocean")}
      >
        {live ? "Join now" : "Set reminder & join"}
      </Link>
    </div>
  );
}
