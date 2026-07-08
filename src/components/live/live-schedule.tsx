"use client";

import { useEffect, useState } from "react";
import { fetchMergedLiveClasses } from "@/lib/live-classes";
import type { LiveClass } from "@/lib/types";
import { LiveClassCard } from "./live-card";

/** Public schedule — shows admin-scheduled classes the moment they exist. */
export function LiveSchedule() {
  const [classes, setClasses] = useState<LiveClass[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchMergedLiveClasses().then(({ classes: merged }) => {
      if (!cancelled) setClasses(merged);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (classes === null) {
    return <div className="skeleton mt-12 h-40 w-full rounded-3xl" aria-hidden />;
  }

  if (classes.length === 0) {
    return (
      <p className="card mt-12 border-dashed p-10 text-center text-sm muted">
        No live classes scheduled right now — check back soon.
      </p>
    );
  }

  const byDay = classes.reduce<Record<string, LiveClass[]>>((acc, lc) => {
    const day = new Date(lc.startsAt).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
    (acc[day] ??= []).push(lc);
    return acc;
  }, {});

  return (
    <div className="mt-12 space-y-10">
      {Object.entries(byDay).map(([day, dayClasses]) => (
        <section key={day}>
          <h2 className="flex items-center gap-3 font-display text-xl font-semibold">
            <span className="h-2.5 w-2.5 rounded-full bg-gold-400" aria-hidden /> {day}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dayClasses.map((lc) => (
              <LiveClassCard key={lc.id} lc={lc} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
