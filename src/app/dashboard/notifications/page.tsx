"use client";

import Link from "next/link";
import { Bell, BellOff, CalendarClock, ClipboardList, Loader2, Megaphone, Radio, Trophy } from "lucide-react";
import { useNotifications } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const ICONS = {
  live: { icon: Radio, cls: "bg-rose-500/10 text-rose-500" },
  assignment: { icon: ClipboardList, cls: "bg-gold-400/15 text-gold-600 dark:text-gold-300" },
  announcement: { icon: Megaphone, cls: "bg-ocean-600/10 text-ocean-600 dark:text-ocean-300" },
  achievement: { icon: Trophy, cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  reminder: { icon: CalendarClock, cls: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
};

export default function NotificationsPage() {
  const { items, unread, loading, markAllRead } = useNotifications();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-sm muted">{loading ? "Loading…" : `${unread} unread`}</p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="btn-ghost btn-sm">
            Mark all as read
          </button>
        )}
      </div>

      {loading && (
        <div className="mt-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-ocean-600" aria-label="Loading notifications" />
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="card mt-6 flex flex-col items-center gap-3 border-dashed p-12 text-center">
          <BellOff className="h-9 w-9 muted" aria-hidden />
          <h2 className="font-display text-xl font-semibold">You're all caught up</h2>
          <p className="max-w-sm text-sm muted">
            Live class reminders, teacher announcements, and the badges you earn will show up here.
          </p>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {items.map((n) => {
          const meta = ICONS[n.type];
          return (
            <div
              key={n.id}
              className={cn(
                "card flex w-full items-start gap-4 p-4 text-left transition-all sm:p-5",
                !n.read && "border-ocean-500/40 bg-ocean-600/[0.04] dark:bg-gold-400/[0.05]"
              )}
            >
              <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", meta.cls)}>
                <meta.icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className={cn("text-sm", !n.read ? "font-bold" : "font-semibold")}>{n.title}</span>
                  {n.time && <span className="shrink-0 text-2xs muted">{n.time}</span>}
                </span>
                <span className="mt-1 block text-sm leading-relaxed muted">{n.body}</span>
              </span>
              {!n.read && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-ocean-600 dark:bg-gold-400" aria-label="Unread" />}
            </div>
          );
        })}
      </div>

      <div className="card mt-8 flex items-center gap-4 p-5">
        <Bell className="h-6 w-6 text-ocean-600 dark:text-gold-400" aria-hidden />
        <p className="text-sm muted">
          Manage email, push, and reminder preferences in{" "}
          <Link href="/dashboard/settings" className="font-semibold text-ocean-600 hover:underline dark:text-gold-400">Settings</Link>.
        </p>
      </div>
    </div>
  );
}
