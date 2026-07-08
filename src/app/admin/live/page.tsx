"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Crown, Loader2, Pencil, Plus, Radio, Server, Trash2, Users, X } from "lucide-react";

import { fetchMergedCourses } from "@/lib/courses";
import type { Course } from "@/lib/types";
import { fetchAllTeachersAdmin, type MergedTeacher } from "@/lib/teachers";
import { supabaseConfigured } from "@/lib/config";
import {
  createLiveClassDb,
  deleteLiveClassDb,
  fetchLiveClassesDb,
  updateLiveClassDb,
  type LiveClassRow,
} from "@/lib/db";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const LEVELS = ["Beginner", "Intermediate", "Advanced", "All Levels"];

interface FormState {
  id?: string; // present when editing
  title: string;
  course_slug: string;
  teacher_id: string;
  starts_at: string; // datetime-local value
  duration_min: number;
  level: string;
}

const emptyForm = (): FormState => ({
  title: "",
  course_slug: "",
  teacher_id: "",
  starts_at: "",
  duration_min: 60,
  level: "All Levels",
});

export default function AdminLivePage() {
  const connected = supabaseConfigured();
  const [rows, setRows] = useState<LiveClassRow[] | null>(null);
  const [catalog, setCatalog] = useState<Course[]>([]);
  useEffect(() => {
    void fetchMergedCourses().then(setCatalog);
  }, []);
  const courseTitle = (slug: string) => catalog.find((c) => c.slug === slug)?.title ?? slug;
  const [faculty, setFaculty] = useState<MergedTeacher[]>([]);
  const [form, setForm] = useState<FormState | null>(null); // null = form closed
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const refresh = useCallback(() => {
    void fetchLiveClassesDb().then(setRows);
  }, []);

  useEffect(() => {
    refresh();
    void fetchAllTeachersAdmin().then((all) => setFaculty(all.filter((t) => !t.hidden)));
  }, [refresh]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setMessage(null);
    if (form.title.trim().length < 4) return setMessage({ kind: "err", text: "Please give the class a title." });
    if (!form.starts_at) return setMessage({ kind: "err", text: "Please pick a date and time." });
    setBusy(true);
    const payload = {
      title: form.title.trim(),
      course_slug: form.course_slug,
      teacher_id: form.teacher_id,
      starts_at: new Date(form.starts_at).toISOString(),
      duration_min: Math.max(15, form.duration_min),
      level: form.level,
      enrolled: 0,
    };
    const res = form.id
      ? await updateLiveClassDb(form.id, payload)
      : await createLiveClassDb({ id: crypto.randomUUID().slice(0, 8), ...payload });
    setBusy(false);
    if (res.ok) {
      setMessage({ kind: "ok", text: form.id ? "Class updated." : "Class scheduled — it's live on the public schedule now." });
      setForm(null);
      refresh();
    } else {
      setMessage({ kind: "err", text: res.error ?? "Failed to save." });
    }
  };

  const remove = async (id: string, title: string) => {
    if (!window.confirm(`Delete “${title}”? Students will no longer see it.`)) return;
    const res = await deleteLiveClassDb(id);
    setMessage(res.ok ? { kind: "ok", text: "Class deleted." } : { kind: "err", text: res.error ?? "Failed to delete." });
    refresh();
  };

  const startEdit = (r: LiveClassRow) => {
    const dt = new Date(r.starts_at);
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm({
      id: r.id,
      title: r.title,
      course_slug: r.course_slug,
      teacher_id: r.teacher_id,
      starts_at: local,
      duration_min: r.duration_min,
      level: r.level,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const usingDemo = rows !== null && rows.length === 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Live classes</h1>
          <p className="mt-1 text-sm muted">
            Schedule real classes — they appear on the public schedule instantly. Enter any room as host to teach.
          </p>
        </div>
        <button onClick={() => setForm(form ? null : emptyForm())} className="btn-gold btn-md">
          {form ? <X className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
          {form ? "Close" : "Schedule a class"}
        </button>
      </div>

      {message && (
        <p
          role="status"
          className={cn(
            "mt-4 rounded-2xl px-4 py-2.5 text-sm font-medium",
            message.kind === "ok" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
          )}
        >
          {message.text}
        </p>
      )}

      {/* Create / edit form */}
      {form && (
        <form onSubmit={save} className="card mt-4 grid animate-scale-in gap-4 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="lc-title" className="label-lh">Class title</label>
            <input id="lc-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Urdu Script Doubt Clinic — Week 3" className="input-lh" />
          </div>
          <div>
            <label htmlFor="lc-course" className="label-lh">Course</label>
            <select id="lc-course" value={form.course_slug} onChange={(e) => setForm({ ...form, course_slug: e.target.value })} className="input-lh">
              <option value="">— No linked course —</option>
              {catalog.map((c) => (
                <option key={c.slug} value={c.slug}>{c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="lc-teacher" className="label-lh">Teacher</label>
            <select id="lc-teacher" value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} className="input-lh">
              {faculty.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="lc-start" className="label-lh">Date & time</label>
            <input id="lc-start" type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="input-lh" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="lc-dur" className="label-lh">Duration (min)</label>
              <input id="lc-dur" type="number" min={15} step={15} value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value) })} className="input-lh" />
            </div>
            <div>
              <label htmlFor="lc-level" className="label-lh">Level</label>
              <select id="lc-level" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="input-lh">
                {LEVELS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className="btn-primary btn-md">
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {form.id ? "Save changes" : "Schedule class"}
            </button>
          </div>
        </form>
      )}

      {/* Backend status */}
      <div className={cn("card mt-6 flex flex-wrap items-center gap-4 p-5", connected ? "border-emerald-500/40" : "border-gold-400/40")}>
        <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", connected ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-gold-400/15 text-gold-600 dark:text-gold-300")}>
          <Server className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">
            {connected
              ? usingDemo
                ? "Connected — showing the demo schedule until you create your first class"
                : "Connected — the public schedule shows your classes below"
              : "Supabase not configured — scheduling disabled"}
          </p>
          <p className="text-xs muted">
            Chat, presence, raised hands, announcements, and host video streaming are live in every room.
          </p>
        </div>
      </div>

      {/* Class list */}
      <div className="mt-6 space-y-3">
        {rows === null && <div className="skeleton h-20 w-full" />}
        {(rows ?? []).map((r) => ({ ...rowView(r, faculty, courseTitle), isDb: true })).map((item) => (
          <div key={item.id} className="card card-hover flex flex-wrap items-center gap-4 p-5">
            {item.teacher && <Avatar name={item.teacher.name} gradient={item.teacher.gradient} className="h-12 w-12" />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">{item.title}</h2>
                {item.starts.getTime() <= Date.now() && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-2xs font-bold uppercase tracking-wider text-white">
                    <Radio className="h-3 w-3" aria-hidden /> Live window open
                  </span>
                )}
                {!item.isDb && <span className="rounded-full bg-navy-900/10 px-2 py-0.5 text-2xs font-bold uppercase muted dark:bg-white/10">Demo</span>}
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs muted">
                <span>{item.course}</span>
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                  {item.starts.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                </span>
                <span>{item.duration} min</span>
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" aria-hidden /> {new Intl.NumberFormat("en-IN").format(item.enrolled)}
                </span>
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {item.isDb && (
                <>
                  <button onClick={() => startEdit(rows!.find((r) => r.id === item.id)!)} className="btn-ghost btn-sm" aria-label={`Edit ${item.title}`}>
                    <Pencil className="h-4 w-4" aria-hidden /> Edit
                  </button>
                  <button onClick={() => remove(item.id, item.title)} className="btn btn-sm border border-rose-500/40 text-rose-500 hover:bg-rose-500/10" aria-label={`Delete ${item.title}`}>
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </>
              )}
              <Link href={`/live/room?id=${item.id}`} className="btn-gold btn-sm">
                <Crown className="h-4 w-4" aria-hidden /> Enter as host
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function rowView(r: LiveClassRow, faculty: MergedTeacher[], courseTitle: (slug: string) => string) {
  return {
    id: r.id,
    title: r.title,
    course: courseTitle(r.course_slug),
    teacher: faculty.find((t) => t.id === r.teacher_id),
    starts: new Date(r.starts_at),
    duration: r.duration_min,
    enrolled: r.enrolled ?? 0,
  };
}
