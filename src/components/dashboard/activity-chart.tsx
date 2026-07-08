"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Weekly study-minutes bar chart. Single series → single hue (#b3383c,
 * validated), thin bars with 4px rounded data-ends, 2px gaps, hover tooltip,
 * direct label on the peak day only. No legend (single series).
 * Data comes from the user's real activity log (lib/activity.ts).
 */
export function ActivityChart({ data }: { data: { day: string; minutes: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.minutes), 1);
  const H = 120;
  const empty = data.every((d) => d.minutes === 0);

  if (empty) {
    return (
      <div className="flex h-[150px] flex-col items-center justify-center text-center">
        <p className="text-sm font-semibold">No study time yet this week</p>
        <p className="mt-1 max-w-[220px] text-xs muted">Watch any lesson and your minutes appear here automatically.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="relative flex h-[150px] items-end justify-between gap-2" role="img" aria-label={`Study minutes this week: ${data.map((d) => `${d.day} ${d.minutes} minutes`).join(", ")}`}>
        {data.map((d, i) => {
          const h = Math.max(6, (d.minutes / max) * H);
          const isPeak = d.minutes === max;
          const isHover = hover === i;
          return (
            <div
              key={d.day}
              className="group relative flex flex-1 flex-col items-center justify-end"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              {/* Tooltip */}
              {isHover && (
                <span className="absolute -top-1 z-10 -translate-y-full whitespace-nowrap rounded-lg bg-navy-900 px-2.5 py-1.5 text-2xs font-semibold text-white shadow-lifted dark:bg-white dark:text-navy-950">
                  {d.minutes} min · {d.day}
                </span>
              )}
              {/* Direct label on peak only */}
              {isPeak && !isHover && (
                <span className="mb-1 text-2xs font-bold text-[#b3383c] dark:text-ocean-400">{d.minutes}m</span>
              )}
              <div
                className={cn(
                  "w-full max-w-[26px] rounded-t transition-all duration-300",
                  isHover ? "opacity-100" : "opacity-90"
                )}
                style={{
                  height: h,
                  background: "#b3383c",
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                }}
              />
              <span className={cn("mt-2 text-2xs font-semibold", isHover ? "text-[var(--lh-ink)]" : "muted")}>{d.day}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 border-t pt-3 text-xs muted">
        {data.reduce((n, d) => n + d.minutes, 0)} minutes this week · best day{" "}
        {data.find((d) => d.minutes === max)?.day}
      </p>
    </div>
  );
}
