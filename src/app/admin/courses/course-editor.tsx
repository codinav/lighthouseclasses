"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { CATEGORIES } from "@/lib/data";
import { upsertCustomCourse, type CustomCourseRow, type CustomModuleJson } from "@/lib/db";
import { invalidateCourses, pickCourseGradient } from "@/lib/courses";
import { fetchAllTeachersAdmin, type MergedTeacher } from "@/lib/teachers";
import { slugify } from "@/lib/utils";
import { useEffect } from "react";
import { VideoInput } from "@/components/admin/video-input";
import { ImageInput } from "@/components/admin/image-input";

const LEVELS = ["Beginner", "Intermediate", "Advanced", "All Levels"];
const ICONS = ["BookOpen", "Languages", "Feather", "Mic", "ScrollText", "Quote", "PenTool", "GraduationCap"];

export interface EditorInitial {
  row?: CustomCourseRow; // present when editing
}

export function CourseEditor({
  initial,
  onDone,
  onCancel,
}: {
  initial?: CustomCourseRow;
  onDone: (msg: string) => void;
  onCancel: () => void;
}) {
  const [faculty, setFaculty] = useState<MergedTeacher[]>([]);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0].name);
  const [level, setLevel] = useState(initial?.level ?? "Beginner");
  const [language, setLanguage] = useState(initial?.language ?? "English");
  const [price, setPrice] = useState(initial?.price ?? 1499);
  const [teacherId, setTeacherId] = useState(initial?.teacher_id ?? "");
  const [outcomes, setOutcomes] = useState(initial?.outcomes ?? "");
  const [includes, setIncludes] = useState(initial?.includes ?? "Lifetime access\nCertificate of completion");
  const [icon, setIcon] = useState(initial?.icon ?? "BookOpen");
  const [thumbnail, setThumbnail] = useState(initial?.thumbnail ?? "");
  const [modules, setModules] = useState<CustomModuleJson[]>(
    initial?.modules_json ?? [{ title: "Getting started", lessons: [{ title: "", durationMin: 10, videoUrl: "", free: true }] }]
  );
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetchAllTeachersAdmin().then((all) => setFaculty(all.filter((t) => !t.hidden)));
  }, []);

  const setModule = (mi: number, patch: Partial<CustomModuleJson>) =>
    setModules((prev) => prev.map((m, i) => (i === mi ? { ...m, ...patch } : m)));

  const setLesson = (mi: number, li: number, patch: Partial<CustomModuleJson["lessons"][number]>) =>
    setModules((prev) =>
      prev.map((m, i) =>
        i === mi ? { ...m, lessons: m.lessons.map((l, j) => (j === li ? { ...l, ...patch } : l)) } : m
      )
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (title.trim().length < 4) return setError("Please give the course a title.");
    if (subtitle.trim().length < 4) return setError("Please add a one-line subtitle.");
    const cleanModules = modules
      .map((m) => ({
        title: m.title.trim() || "Module",
        lessons: m.lessons.filter((l) => l.title.trim().length > 0).map((l) => ({ ...l, title: l.title.trim(), durationMin: Math.max(1, l.durationMin) })),
      }))
      .filter((m) => m.lessons.length > 0);
    if (cleanModules.length === 0) return setError("Add at least one lesson (with a title) to the curriculum.");

    setBusy(true);
    const res = await upsertCustomCourse({
      slug: initial?.slug ?? `${slugify(title)}-${crypto.randomUUID().slice(0, 4)}`,
      title: title.trim(),
      subtitle: subtitle.trim(),
      description: description.trim() || subtitle.trim(),
      category,
      level,
      language,
      price: Math.max(0, Math.round(price)),
      original_price: Math.round(price * 1.8),
      teacher_id: teacherId,
      outcomes,
      includes,
      modules_json: cleanModules,
      gradient: initial?.gradient ?? pickCourseGradient(Math.floor(Math.random() * 6)),
      icon,
      thumbnail: thumbnail.trim(),
      hidden: initial?.hidden ?? false,
      featured,
    });
    setBusy(false);
    if (res.ok) {
      invalidateCourses();
      onDone(initial ? "Course updated — live on the site now." : `“${title.trim()}” is live in the catalog.`);
    } else if (/thumbnail|featured/i.test(res.error ?? "")) {
      setError("One-time setup needed — run in Supabase SQL editor: alter table courses_custom add column if not exists thumbnail text; alter table courses_custom add column if not exists featured boolean not null default false;");
    } else {
      setError(res.error ?? "Failed to save the course.");
    }
  };

  return (
    <form onSubmit={submit} className="card mt-4 animate-scale-in space-y-5 p-6">
      <h2 className="font-display text-lg font-semibold">{initial ? "Edit course" : "Add a course"}</h2>
      {error && (
        <p role="alert" className="rounded-2xl bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label-lh" htmlFor="cc-title">Title</label>
          <input id="cc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Urdu Handwriting: The Daily Practice Course" className="input-lh" />
        </div>
        <div className="sm:col-span-2">
          <label className="label-lh" htmlFor="cc-sub">Subtitle</label>
          <input id="cc-sub" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="One line that sells the course." className="input-lh" />
        </div>
        <div className="sm:col-span-2">
          <label className="label-lh" htmlFor="cc-desc">Description</label>
          <textarea id="cc-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="input-lh resize-none" />
        </div>
        <div>
          <label className="label-lh" htmlFor="cc-cat">Category</label>
          <select id="cc-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="input-lh">
            {CATEGORIES.map((c) => (
              <option key={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-lh" htmlFor="cc-teacher">Teacher</label>
          <select id="cc-teacher" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="input-lh">
            <option value="">— Select a teacher —</option>
            {faculty.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {faculty.length === 0 && (
            <p className="mt-1 text-2xs muted">No teachers yet — add them in <span className="font-semibold">Admin → Teachers</span> first.</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-lh" htmlFor="cc-level">Level</label>
            <select id="cc-level" value={level} onChange={(e) => setLevel(e.target.value)} className="input-lh">
              {LEVELS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-lh" htmlFor="cc-price">Price (₹)</label>
            <input id="cc-price" type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} className="input-lh" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-lh" htmlFor="cc-lang">Language</label>
            <input id="cc-lang" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="Hindi + English" className="input-lh" />
          </div>
          <div>
            <label className="label-lh" htmlFor="cc-icon">Cover icon <span className="muted">(fallback when no image)</span></label>
            <select id="cc-icon" value={icon} onChange={(e) => setIcon(e.target.value)} className="input-lh">
              {ICONS.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </div>
        </div>
        <ImageInput value={thumbnail} onChange={setThumbnail} label="Course thumbnail (optional)" />
        <div>
          <label className="label-lh" htmlFor="cc-out">What you'll learn <span className="muted">(one per line)</span></label>
          <textarea id="cc-out" rows={3} value={outcomes} onChange={(e) => setOutcomes(e.target.value)} className="input-lh resize-none" placeholder={"Read the full alphabet\nWrite joined words confidently"} />
        </div>
        <div>
          <label className="label-lh" htmlFor="cc-inc">This course includes <span className="muted">(one per line)</span></label>
          <textarea id="cc-inc" rows={3} value={includes} onChange={(e) => setIncludes(e.target.value)} className="input-lh resize-none" />
        </div>
      </div>

      {/* Curriculum builder */}
      <div>
        <p className="label-lh">Curriculum</p>
        <div className="space-y-4">
          {modules.map((m, mi) => (
            <div key={mi} className="rounded-2xl border p-4">
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-2xs font-bold uppercase tracking-widest muted">Module {mi + 1}</span>
                <input
                  value={m.title}
                  onChange={(e) => setModule(mi, { title: e.target.value })}
                  placeholder="Module title"
                  className="input-lh !py-2"
                />
                {modules.length > 1 && (
                  <button type="button" onClick={() => setModules((prev) => prev.filter((_, i) => i !== mi))} className="btn-ghost h-9 w-9 shrink-0 rounded-full !p-0 text-rose-500" aria-label="Remove module">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="mt-3 space-y-2">
                {m.lessons.map((l, li) => (
                  <div key={li} className="space-y-2 rounded-xl bg-navy-900/[0.03] p-3 dark:bg-white/[0.03]">
                    <div className="grid items-center gap-2 sm:grid-cols-[1fr_90px_auto_auto]">
                      <input
                        value={l.title}
                        onChange={(e) => setLesson(mi, li, { title: e.target.value })}
                        placeholder={`Lesson ${li + 1} title`}
                        className="input-lh !py-2"
                        aria-label="Lesson title"
                      />
                      <input
                        type="number"
                        min={1}
                        value={l.durationMin}
                        onChange={(e) => setLesson(mi, li, { durationMin: Number(e.target.value) })}
                        className="input-lh !py-2"
                        aria-label="Duration in minutes"
                        title="Minutes"
                      />
                      <label className="flex items-center gap-1.5 whitespace-nowrap px-1 text-xs font-semibold">
                        <input type="checkbox" checked={l.free ?? false} onChange={(e) => setLesson(mi, li, { free: e.target.checked })} className="h-4 w-4 accent-[#b3383c]" />
                        Free
                      </label>
                      <button
                        type="button"
                        onClick={() => setModule(mi, { lessons: m.lessons.filter((_, j) => j !== li) })}
                        className="btn-ghost h-9 w-9 rounded-full !p-0 text-rose-500 justify-self-end"
                        aria-label="Remove lesson"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <VideoInput value={l.videoUrl ?? ""} onChange={(url) => setLesson(mi, li, { videoUrl: url })} label={`Lesson ${li + 1} video`} />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setModule(mi, { lessons: [...m.lessons, { title: "", durationMin: 10, videoUrl: "", free: false }] })}
                  className="btn-ghost btn-sm"
                >
                  <Plus className="h-4 w-4" aria-hidden /> Add lesson
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setModules((prev) => [...prev, { title: "", lessons: [{ title: "", durationMin: 10, videoUrl: "", free: false }] }])}
            className="btn-ghost btn-md"
          >
            <Plus className="h-4 w-4" aria-hidden /> Add module
          </button>
        </div>
        <p className="mt-2 text-xs muted">
          For each lesson you can <strong>paste a video link</strong> or <strong>upload a file from your device</strong>. Lessons
          without a video show a “coming soon” note until you add one.
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gold-400/40 bg-gold-400/[0.06] p-4">
        <input
          type="checkbox"
          checked={featured}
          onChange={(e) => setFeatured(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#f4b400]"
        />
        <span>
          <span className="block text-sm font-semibold">Feature on homepage</span>
          <span className="block text-xs muted">Show this course in the homepage “Featured courses” spotlight.</span>
        </span>
      </label>

      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="btn-gold btn-md">
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {initial ? "Save changes" : "Publish course"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost btn-md">Cancel</button>
      </div>
    </form>
  );
}
