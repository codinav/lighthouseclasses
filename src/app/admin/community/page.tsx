"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Megaphone, MessageSquare, Pin, PinOff, Plus, Power, Trash2, Users, X } from "lucide-react";
import { supabaseConfigured } from "@/lib/config";
import {
  deleteAnnouncement,
  deleteGroup,
  deleteThread,
  fetchAnnouncements,
  fetchGroups,
  fetchThreads,
  setThreadPinned,
  upsertAnnouncement,
  upsertGroup,
  type AnnouncementRow,
  type GroupRow,
  type ThreadRow,
} from "@/lib/db";
import { Avatar } from "@/components/ui/avatar";
import { cn, slugify } from "@/lib/utils";

export default function AdminCommunityPage() {
  const connected = supabaseConfigured();
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [threads, setThreads] = useState<ThreadRow[] | null>(null);
  const [annForm, setAnnForm] = useState<{ title: string; body: string; href: string } | null>(null);
  const [groupForm, setGroupForm] = useState<{ id?: string; name: string; description: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(() => {
    void fetchAnnouncements().then(setAnnouncements);
    void fetchGroups().then(setGroups);
    void fetchThreads().then(setThreads);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annForm || annForm.title.trim().length < 4) return;
    setBusy(true);
    const res = await upsertAnnouncement({
      id: crypto.randomUUID(),
      title: annForm.title.trim(),
      body: annForm.body.trim(),
      href: annForm.href.trim() || null,
      active: true,
    });
    setBusy(false);
    if (res.ok) {
      setNotice("Announcement published — it's live on the community page.");
      setAnnForm(null);
      refresh();
    }
  };

  const saveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm || groupForm.name.trim().length < 3) return;
    setBusy(true);
    const res = await upsertGroup({
      id: groupForm.id ?? slugify(groupForm.name),
      name: groupForm.name.trim(),
      description: groupForm.description.trim(),
      members: 0,
    });
    setBusy(false);
    if (res.ok) {
      setNotice(groupForm.id ? "Group updated." : "Group created.");
      setGroupForm(null);
      refresh();
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Community</h1>
        <p className="mt-1 text-sm muted">Announcements, study groups, and thread moderation.</p>
        {!connected && <p className="card mt-3 border-gold-400/40 p-4 text-sm muted">Connect Supabase to manage the community.</p>}
        {notice && (
          <p role="status" className="mt-3 rounded-2xl bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">{notice}</p>
        )}
      </div>

      {/* Announcements */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Megaphone className="h-5 w-5 text-gold-500" aria-hidden /> Announcements
          </h2>
          <button onClick={() => setAnnForm(annForm ? null : { title: "", body: "", href: "" })} className="btn-gold btn-sm" disabled={!connected}>
            {annForm ? <X className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
            {annForm ? "Close" : "New announcement"}
          </button>
        </div>
        <p className="mt-1 text-xs muted">The most recent active announcement shows as the gold banner on the community page.</p>

        {annForm && (
          <form onSubmit={saveAnnouncement} className="card mt-3 grid animate-scale-in gap-3 p-5">
            <input value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} placeholder="Title — e.g. Monthly Mushaira this Sunday, 8 PM" className="input-lh" aria-label="Announcement title" />
            <input value={annForm.body} onChange={(e) => setAnnForm({ ...annForm, body: e.target.value })} placeholder="One supporting line (optional)" className="input-lh" aria-label="Announcement body" />
            <input value={annForm.href} onChange={(e) => setAnnForm({ ...annForm, href: e.target.value })} placeholder="Link (optional) — e.g. /live" className="input-lh" aria-label="Announcement link" />
            <button type="submit" disabled={busy} className="btn-primary btn-md w-fit">
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Publish
            </button>
          </form>
        )}

        <div className="mt-3 space-y-2">
          {announcements.length === 0 && <p className="card border-dashed p-5 text-center text-sm muted">No announcements yet.</p>}
          {announcements.map((a) => (
            <div key={a.id} className={cn("card flex flex-wrap items-center gap-3 p-4", !a.active && "opacity-50")}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{a.title}</p>
                {a.body && <p className="truncate text-xs muted">{a.body}</p>}
              </div>
              <button onClick={async () => { await upsertAnnouncement({ ...a, active: !a.active }); refresh(); }} className="btn-ghost btn-sm">
                <Power className="h-4 w-4" aria-hidden /> {a.active ? "Deactivate" : "Activate"}
              </button>
              <button onClick={async () => { await deleteAnnouncement(a.id); refresh(); }} className="btn btn-sm border border-rose-500/40 text-rose-500 hover:bg-rose-500/10" aria-label="Delete announcement">
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Groups */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Users className="h-5 w-5 text-ocean-600 dark:text-gold-400" aria-hidden /> Study groups
          </h2>
          <button onClick={() => setGroupForm(groupForm ? null : { name: "", description: "" })} className="btn-gold btn-sm" disabled={!connected}>
            {groupForm ? <X className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
            {groupForm ? "Close" : "New group"}
          </button>
        </div>

        {groupForm && (
          <form onSubmit={saveGroup} className="card mt-3 grid animate-scale-in gap-3 p-5">
            <input value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} placeholder="Group name — e.g. Script Sprinters" className="input-lh" aria-label="Group name" />
            <input value={groupForm.description} onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })} placeholder="One-line description" className="input-lh" aria-label="Group description" />
            <button type="submit" disabled={busy} className="btn-primary btn-md w-fit">
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} {groupForm.id ? "Save" : "Create group"}
            </button>
          </form>
        )}

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {groups.length === 0 && <p className="card border-dashed p-5 text-center text-sm muted sm:col-span-2">No groups yet — the demo groups show publicly until you create one.</p>}
          {groups.map((g) => (
            <div key={g.id} className="card flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{g.name}</p>
                <p className="truncate text-xs muted">{g.description}</p>
              </div>
              <button onClick={() => setGroupForm({ id: g.id, name: g.name, description: g.description })} className="btn-ghost btn-sm">Edit</button>
              <button onClick={async () => { if (window.confirm(`Delete group “${g.name}”?`)) { await deleteGroup(g.id); refresh(); } }} className="btn btn-sm border border-rose-500/40 text-rose-500 hover:bg-rose-500/10" aria-label={`Delete ${g.name}`}>
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      </section>
      

      {/* Thread moderation */}
      <section>
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <MessageSquare className="h-5 w-5 text-ocean-600 dark:text-gold-400" aria-hidden /> Discussions
        </h2>
        <p className="mt-1 text-xs muted">Pin important threads to the top, or remove anything that breaks the guidelines.</p>
        <div className="mt-3 space-y-2">
          {threads === null && <div className="skeleton h-16 w-full" />}
          {threads !== null && threads.length === 0 && (
            <p className="card border-dashed p-5 text-center text-sm muted">No student threads yet — they'll appear here as people post.</p>
          )}
          {(threads ?? []).map((t) => (
            <div key={t.id} className="card flex flex-wrap items-center gap-3 p-4">
              <Avatar name={t.author_name} className="h-9 w-9 text-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {t.pinned && <Pin className="mr-1 inline h-3.5 w-3.5 text-gold-500" aria-label="Pinned" />}
                  {t.title}
                </p>
                <p className="truncate text-xs muted">
                  {t.author_name} · {t.tag} · {t.reply_count} replies · {t.likes} likes
                </p>
              </div>
              <button onClick={async () => { await setThreadPinned(t.id, !t.pinned); refresh(); }} className="btn-ghost btn-sm">
                {t.pinned ? <PinOff className="h-4 w-4" aria-hidden /> : <Pin className="h-4 w-4" aria-hidden />}
                {t.pinned ? "Unpin" : "Pin"}
              </button>
              <button onClick={async () => { if (window.confirm(`Delete “${t.title}” and its replies?`)) { await deleteThread(t.id); refresh(); } }} className="btn btn-sm border border-rose-500/40 text-rose-500 hover:bg-rose-500/10" aria-label={`Delete ${t.title}`}>
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
