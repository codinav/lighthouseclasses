"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Heart, Loader2, Megaphone, MessageSquare, Pin, Plus, Users, X } from "lucide-react";
import { useAuth } from "@/lib/providers";
import {
  createThread,
  fetchActiveAnnouncement,
  fetchGroups,
  fetchThreads,
  type AnnouncementRow,
  type GroupRow,
  type ThreadRow,
} from "@/lib/db";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const TAGS = ["General", "Urdu Script", "Urdu Poetry", "English", "Persian", "Success Story"];

function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${Math.max(1, min)}m`;
  if (min < 1440) return `${Math.floor(min / 60)}h`;
  return `${Math.floor(min / 1440)}d`;
}

export function CommunityBoard() {
  const { user } = useAuth();
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadRow[] | null>(null);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [announcement, setAnnouncement] = useState<AnnouncementRow | null>(null);
  const [composer, setComposer] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState(TAGS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(() => {
    void fetchThreads().then(setThreads);
    void fetchGroups().then(setGroups);
    void fetchActiveAnnouncement().then(setAnnouncement);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startThread = () => {
    if (!user) {
      router.push("/auth/login?next=/community");
      return;
    }
    setComposer((v) => !v);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError("");
    if (title.trim().length < 8) return setError("Give your thread a clear title (at least 8 characters).");
    setBusy(true);
    const res = await createThread(title.trim(), body.trim(), tag, user.name, user.email);
    setBusy(false);
    if (res.ok && res.id) {
      setComposer(false);
      setTitle("");
      setBody("");
      router.push(`/community/thread?id=${res.id}`);
    } else {
      setError(res.error ?? "Couldn't post — is the community set up yet?");
    }
  };

  const liveThreads = threads !== null && threads.length > 0;

  return (
    <>
      {/* Announcement */}
      <div className="mt-8">
        <div className="card flex flex-wrap items-center gap-4 border-gold-400/40 bg-gold-400/5 p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-400/20">
            <Megaphone className="h-5 w-5 text-gold-600 dark:text-gold-300" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{announcement?.title ?? "Monthly Mushaira — this Sunday, 8 PM"}</p>
            <p className="text-xs muted">{announcement?.body ?? "Student ghazal night with Ustad Zafar Hashmi."}</p>
          </div>
          <Link href={announcement?.href ?? "/live"} className="btn-gold btn-sm">
            {announcement ? "Learn more" : "Join event"}
          </Link>
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        {/* Threads */}
        <section aria-labelledby="threads-h">
          <div className="flex items-center justify-between">
            <h2 id="threads-h" className="font-display text-xl font-semibold">
              {liveThreads ? "Discussions" : "Trending discussions"}
            </h2>
            <button onClick={startThread} className="btn-ocean btn-sm">
              {composer ? <X className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
              {composer ? "Close" : "Start a thread"}
            </button>
          </div>

          {composer && user && (
            <form onSubmit={submit} className="card mt-4 animate-scale-in space-y-3 p-5">
              {error && <p role="alert" className="rounded-2xl bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>}
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What do you want to discuss?" className="input-lh" aria-label="Thread title" />
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Add details, context, or your question… (optional)" className="input-lh resize-none" aria-label="Thread body" />
              <div className="flex flex-wrap items-center gap-2">
                {TAGS.map((t) => (
                  <button key={t} type="button" onClick={() => setTag(t)} className={cn("chip", tag === t ? "border-ocean-600 bg-ocean-600 text-white" : "hover:border-ocean-500")}>
                    {t}
                  </button>
                ))}
              </div>
              <button type="submit" disabled={busy} className="btn-gold btn-md">
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Post thread
              </button>
            </form>
          )}

          <div className="mt-4 space-y-3">
            {threads === null && <div className="skeleton h-24 w-full" />}
            {liveThreads
              ? threads!.map((t) => (
                  <Link key={t.id} href={`/community/thread?id=${t.id}`} className="card card-hover flex gap-4 p-4 sm:p-5">
                    <Avatar name={t.author_name} className="hidden h-10 w-10 sm:flex" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {t.pinned && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gold-400/15 px-2 py-0.5 text-2xs font-bold text-gold-600 dark:text-gold-300">
                            <Pin className="h-3 w-3" aria-hidden /> Pinned
                          </span>
                        )}
                        <span className="chip !py-0.5 text-2xs">{t.tag}</span>
                        <span className="text-2xs muted">{relative(t.created_at)} ago</span>
                      </div>
                      <h3 className="mt-1.5 text-sm font-semibold leading-snug sm:text-base">{t.title}</h3>
                      <div className="mt-2 flex items-center gap-4 text-xs muted">
                        <span>{t.author_name}</span>
                        <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" aria-hidden /> {t.reply_count}</span>
                        <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" aria-hidden /> {t.likes}</span>
                      </div>
                    </div>
                  </Link>
                ))
              : threads !== null && (
                  <div className="card p-8 text-center">
                    <MessageSquare className="mx-auto h-8 w-8 text-ocean-600 dark:text-gold-400" aria-hidden />
                    <p className="mt-3 font-semibold">No discussions yet</p>
                    <p className="mx-auto mt-1 max-w-sm text-sm muted">
                      Be the first to ask a question, share a sher, or celebrate a milestone.
                    </p>
                    <button onClick={startThread} className="btn-primary btn-sm mt-4">
                      <Plus className="h-4 w-4" aria-hidden /> Start the first discussion
                    </button>
                  </div>
                )}
          </div>
        </section>

        {/* Groups */}
        <aside aria-labelledby="groups-h">
          <h2 id="groups-h" className="font-display text-xl font-semibold">Study groups</h2>
          <div className="mt-4 space-y-3">
            {groups.length === 0 && (
              <p className="card p-5 text-sm muted">Study groups are coming soon — announced in live classes first.</p>
            )}
            {groups.map((g) => (
              <div key={g.id} className="card card-hover p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold">{g.name}</h3>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs muted">
                    <Users className="h-3.5 w-3.5" aria-hidden /> {new Intl.NumberFormat("en-IN").format(g.members)}
                  </span>
                </div>
                <p className="mt-1 text-xs muted">{g.description}</p>
                <button onClick={startThread} className="btn-ghost btn-sm mt-3 w-full">Join group</button>
              </div>
            ))}
          </div>

          <div className="card mt-6 bg-gradient-to-br from-navy-900 to-ocean-800 p-6 text-white">
            <p className="font-display text-lg font-semibold">Community guidelines</p>
            <p className="mt-2 text-xs leading-relaxed text-white/70">
              Be kind. Explain, don't flex. Credit sources. No spam, no shortcuts culture — we're
              all here to genuinely learn.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
