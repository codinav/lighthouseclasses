"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ChevronLeft, Heart, Loader2, Pin, Send } from "lucide-react";
import { useAuth } from "@/lib/providers";
import { addPost, fetchPosts, fetchThread, likeThread, type PostRow, type ThreadRow } from "@/lib/db";
import { Avatar } from "@/components/ui/avatar";

export default function ThreadPage() {
  return (
    <Suspense>
      <ThreadView />
    </Suspense>
  );
}

function ThreadView() {
  const id = useSearchParams().get("id") ?? "";
  const { user } = useAuth();
  const router = useRouter();
  const [thread, setThread] = useState<ThreadRow | null | undefined>(undefined);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [liked, setLiked] = useState(false);

  const refresh = useCallback(() => {
    if (!id) {
      setThread(null);
      return;
    }
    void fetchThread(id).then(setThread);
    void fetchPosts(id).then(setPosts);
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    if (!user) {
      router.push(`/auth/login?next=/community/thread?id=${id}`);
      return;
    }
    setBusy(true);
    const res = await addPost(id, user.name, user.email, reply.trim());
    setBusy(false);
    if (res.ok) {
      setReply("");
      refresh();
    }
  };

  const like = async () => {
    if (liked || !thread) return;
    setLiked(true);
    setThread({ ...thread, likes: thread.likes + 1 });
    await likeThread(thread.id);
  };

  if (thread === undefined) {
    return (
      <div className="container-lh flex min-h-[50vh] items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-ocean-600" aria-label="Loading thread" />
      </div>
    );
  }

  if (thread === null) {
    return (
      <div className="container-lh py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Thread not found</h1>
        <Link href="/community" className="btn-primary btn-md mt-6">Back to community</Link>
      </div>
    );
  }

  return (
    <div className="container-lh max-w-3xl py-10">
      <Link href="/community" className="inline-flex items-center gap-1 text-sm font-semibold text-ocean-600 hover:underline dark:text-gold-400">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Community
      </Link>

      <article className="card mt-4 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          {thread.pinned && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold-400/15 px-2 py-0.5 text-2xs font-bold text-gold-600 dark:text-gold-300">
              <Pin className="h-3 w-3" aria-hidden /> Pinned
            </span>
          )}
          <span className="chip !py-0.5 text-2xs">{thread.tag}</span>
          <span className="text-2xs muted">
            {new Date(thread.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>
        <h1 className="mt-3 font-display text-2xl font-semibold leading-snug">{thread.title}</h1>
        <div className="mt-3 flex items-center gap-2.5">
          <Avatar name={thread.author_name} className="h-8 w-8 text-xs" />
          <span className="text-sm font-medium">{thread.author_name}</span>
        </div>
        {thread.body && <p className="mt-4 leading-relaxed muted">{thread.body}</p>}
        <button
          onClick={like}
          disabled={liked}
          className={`mt-5 inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${liked ? "border-rose-400 text-rose-500" : "hover:border-rose-400 hover:text-rose-500"}`}
          aria-pressed={liked}
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} aria-hidden /> {thread.likes}
        </button>
      </article>

      <h2 className="mt-8 font-display text-lg font-semibold">
        {posts.length} {posts.length === 1 ? "reply" : "replies"}
      </h2>
      <div className="mt-3 space-y-3">
        {posts.map((p) => (
          <div key={p.id} className="card flex gap-3 p-5">
            <Avatar name={p.author_name} className="h-9 w-9 shrink-0 text-xs" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {p.author_name}{" "}
                <span className="ml-1 text-2xs font-normal muted">
                  {new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </p>
              <p className="mt-1 text-sm leading-relaxed">{p.text}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={submitReply} className="card mt-6 p-5">
        <label htmlFor="reply" className="label-lh">{user ? `Reply as ${user.name}` : "Reply"}</label>
        <div className="flex gap-2">
          <input
            id="reply"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={user ? "Add your thoughts…" : "Sign in to reply"}
            className="input-lh"
          />
          <button type="submit" disabled={busy || !reply.trim()} className="btn-gold btn-md shrink-0" aria-label="Send reply">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </form>
    </div>
  );
}
