"use client";

import { BookOpen, Copy, Check, Mail, Phone, Radio, UserPlus } from "lucide-react";
import { useState } from "react";
import { useLiveSignups } from "@/lib/live-signups";
import { supabaseConfigured } from "@/lib/config";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/**
 * Real-time feed of who just created an account — name, email, phone, and the
 * course(s) they enrolled in — updating live via Supabase Realtime.
 */
export function LiveSignups({ limit }: { limit?: number }) {
  const { records, live, connected, loading, newCount } = useLiveSignups();
  const [copied, setCopied] = useState(false);
  const shown = limit ? records.slice(0, limit) : records;

  const copyPhones = async () => {
    const phones = records.map((r) => r.phone).filter(Boolean).join(", ");
    try {
      await navigator.clipboard.writeText(phones);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <UserPlus className="h-5 w-5 text-ocean-600 dark:text-gold-400" aria-hidden />
            New accounts — live
          </h2>
          <p className="mt-0.5 flex items-center gap-2 text-xs muted">
            <span className={cn("inline-flex items-center gap-1", connected ? "text-emerald-600 dark:text-emerald-400" : "muted")}>
              <Radio className={cn("h-3.5 w-3.5", connected && "animate-pulse")} aria-hidden />
              {connected ? "Live" : "Connecting…"}
            </span>
            · {records.length} total
            {newCount > 0 && <span className="font-semibold text-ocean-600 dark:text-gold-400">· {newCount} new this session</span>}
          </p>
        </div>
        {live && records.some((r) => r.phone) && (
          <button onClick={copyPhones} className="btn-ghost btn-sm" title="Copy all phone numbers">
            {copied ? <Check className="h-4 w-4 text-emerald-500" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            {copied ? "Copied!" : "Copy numbers"}
          </button>
        )}
      </div>

      {!supabaseConfigured() && (
        <p className="mt-5 rounded-2xl bg-gold-400/10 px-4 py-3 text-sm muted">
          Connect Supabase to see live signups.
        </p>
      )}

      {loading && (
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-16 w-full" />
          ))}
        </div>
      )}

      {!loading && supabaseConfigured() && records.length === 0 && (
        <div className="mt-5 flex flex-col items-center gap-2 rounded-2xl border border-dashed p-10 text-center">
          <UserPlus className="h-8 w-8 muted" aria-hidden />
          <p className="font-semibold">Waiting for the first signup</p>
          <p className="max-w-sm text-sm muted">The moment someone creates an account, they appear here in real time — name, email, phone, and the course they join.</p>
        </div>
      )}

      {!loading && shown.length > 0 && (
        <ul className="mt-5 space-y-2">
          {shown.map((r) => (
            <li
              key={r.email}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-2xl border p-3 transition-colors sm:flex-nowrap",
                r.isNew && "animate-scale-in border-ocean-500/50 bg-ocean-600/[0.05] dark:border-gold-400/40 dark:bg-gold-400/[0.06]"
              )}
            >
              <Avatar name={r.name} className="h-10 w-10 shrink-0 text-xs" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">{r.name}</p>
                  {r.isNew && <span className="shrink-0 rounded-full bg-ocean-600 px-1.5 py-0.5 text-2xs font-bold text-white dark:bg-gold-400 dark:text-navy-950">NEW</span>}
                  <span className="shrink-0 rounded-full bg-navy-900/[0.06] px-2 py-0.5 text-2xs font-semibold capitalize muted dark:bg-white/10">{r.provider}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs muted">
                  <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 hover:underline">
                    <Mail className="h-3 w-3" aria-hidden /> {r.email}
                  </a>
                  {r.phone ? (
                    <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 hover:underline">
                      <Phone className="h-3 w-3" aria-hidden /> {r.phone}
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 opacity-60">
                      <Phone className="h-3 w-3" aria-hidden /> no number
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <BookOpen className="h-3 w-3 shrink-0 muted" aria-hidden />
                  {r.courses.length > 0 ? (
                    r.courses.map((c) => (
                      <span key={c} className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-2xs font-semibold text-emerald-700 dark:text-emerald-400">
                        {c}
                      </span>
                    ))
                  ) : (
                    <span className="text-2xs muted">No course enrolled yet</span>
                  )}
                </div>
              </div>
              <span className="shrink-0 self-start text-2xs muted sm:self-center">{relative(r.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}