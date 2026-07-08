"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Loader2, RadioTower } from "lucide-react";
import type { LiveClass } from "@/lib/types";
import { findLiveClass } from "@/lib/live-classes";
import { LiveRoom } from "@/components/live/live-room";
import { AuthGate } from "@/components/auth/auth-gate";

/**
 * Universal live-room route: /live/room?id=<classId>. Works for both the
 * demo schedule and admin-created classes (which can't be prerendered on
 * static hosting).
 */
export default function LiveRoomByQueryPage() {
  return (
    <AuthGate>
      <Suspense>
        <RoomResolver />
      </Suspense>
    </AuthGate>
  );
}

function RoomResolver() {
  const id = useSearchParams().get("id") ?? "";
  const [lc, setLc] = useState<LiveClass | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    if (!id) {
      setLc(null);
      return;
    }
    let cancelled = false;
    void findLiveClass(id).then((found) => {
      if (!cancelled) setLc(found);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (lc === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-950 text-white">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-gold-400" aria-hidden />
          <p className="mt-4 text-sm text-white/60">Opening the classroom…</p>
        </div>
      </div>
    );
  }

  if (lc === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-navy-950 px-6 text-center text-white">
        <RadioTower className="h-12 w-12 text-white/40" aria-hidden />
        <h1 className="mt-5 font-display text-2xl font-semibold">Class not found</h1>
        <p className="mt-2 max-w-sm text-sm text-white/60">
          This live class may have been removed or the link is incorrect.
        </p>
        <Link href="/live" className="btn-gold btn-md mt-6">View the schedule</Link>
      </div>
    );
  }

  return <LiveRoom lc={lc} />;
}
