"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Database, ExternalLink, Eye, EyeOff, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { supabaseConfigured } from "@/lib/config";
import { deleteCustomCourse, fetchCustomCourses, upsertCustomCourse, type CustomCourseRow } from "@/lib/db";
import { invalidateCourses } from "@/lib/courses";
import { CourseEditor } from "./course-editor";
import { formatINR } from "@/lib/utils";
import { CourseCover } from "@/components/ui/course-cover";
import { cn } from "@/lib/utils";

export default function AdminCoursesPage() {
  const connected = supabaseConfigured();
  const [custom, setCustom] = useState<CustomCourseRow[] | null>(null);
  const [editor, setEditor] = useState<{ open: boolean; initial?: CustomCourseRow }>({ open: false });
  const [notice, setNotice] = useState("");

  const refresh = () => void fetchCustomCourses().then(setCustom);

  useEffect(() => {
    refresh();
  }, []);

  const toggleHidden = async (r: CustomCourseRow) => {
    await upsertCustomCourse({ ...r, hidden: !r.hidden });
    invalidateCourses();
    refresh();
  };

  const toggleFeatured = async (r: CustomCourseRow) => {
    const res = await upsertCustomCourse({ ...r, featured: !r.featured });
    if (!res.ok && /featured/i.test(res.error ?? "")) {
      setNotice("One-time setup: run this in the Supabase SQL editor → alter table courses_custom add column if not exists featured boolean not null default false;");
      return;
    }
    invalidateCourses();
    refresh();
    setNotice(r.featured ? `“${r.title}” removed from the homepage.` : `“${r.title}” is now featured on the homepage.`);
  };

  const remove = async (r: CustomCourseRow) => {
    if (!window.confirm(`Delete “${r.title}”? Students who bought it will lose access.`)) return;
    await deleteCustomCourse(r.slug);
    invalidateCourses();
    refresh();
    setNotice(`“${r.title}” deleted.`);
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Courses</h1>
          <p className="mt-1 flex items-center gap-2 text-sm muted">
            <Database className="h-3.5 w-3.5" aria-hidden />
            {connected
              ? "Create courses with full curricula, feature them on the homepage, hide or delete them — all live instantly."
              : "Connect Supabase to create and manage courses."}
          </p>
        </div>
        <button onClick={() => setEditor(editor.open ? { open: false } : { open: true })} className="btn-gold btn-md" disabled={!connected}>
          {editor.open ? <X className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
          {editor.open ? "Close" : "Add course"}
        </button>
      </div>

      {notice && (
        <p role="status" className="mt-4 rounded-2xl bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">{notice}</p>
      )}

      {editor.open && (
        <CourseEditor
          initial={editor.initial}
          onDone={(msg) => {
            setEditor({ open: false });
            setNotice(msg);
            refresh();
          }}
          onCancel={() => setEditor({ open: false })}
        />
      )}

      <div className="mt-8 space-y-3">
        {custom === null && <div className="skeleton h-24 w-full" />}
        {custom !== null && custom.length === 0 && !editor.open && (
          <div className="card p-10 text-center">
            <p className="font-semibold">No courses yet.</p>
            <p className="mx-auto mt-1 max-w-md text-sm muted">
              Click “Add course” to create your first one — set its curriculum, price, and tick
              “Feature on homepage” to show it in the homepage spotlight.
            </p>
          </div>
        )}
        {(custom ?? []).map((r) => (
          <div key={r.slug} className={cn("card card-hover flex flex-wrap items-center gap-4 p-5", r.hidden && "opacity-50")}>
            <CourseCover gradient={r.gradient} icon={r.icon} thumbnail={r.thumbnail} className="h-12 w-20 shrink-0 rounded-xl" iconClassName="h-5 w-5" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate font-semibold">
                {r.title}
                {r.featured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold-400/15 px-2 py-0.5 text-2xs font-bold uppercase tracking-wider text-gold-600 dark:text-gold-300">
                    <Star className="h-3 w-3 fill-current" aria-hidden /> Featured
                  </span>
                )}
              </p>
              <p className="truncate text-xs muted">
                {r.category} · {r.level} · {formatINR(r.price)} · {r.modules_json.reduce((n, m) => n + m.lessons.length, 0)} lessons
                {r.hidden && <span className="ml-2 font-bold uppercase text-rose-500">Hidden</span>}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                onClick={() => toggleFeatured(r)}
                className={cn("btn-ghost btn-sm", r.featured && "border-gold-400/60 bg-gold-400/10 text-gold-600 dark:text-gold-300")}
                aria-pressed={r.featured}
                title={r.featured ? "Remove from homepage" : "Feature on homepage"}
              >
                <Star className={cn("h-4 w-4", r.featured && "fill-current")} aria-hidden />
                {r.featured ? "Featured" : "Feature"}
              </button>
              <Link href={`/courses/view?slug=${r.slug}`} className="btn-ghost btn-sm">
                <ExternalLink className="h-4 w-4" aria-hidden /> View
              </Link>
              <button onClick={() => setEditor({ open: true, initial: r })} className="btn-ghost btn-sm">
                <Pencil className="h-4 w-4" aria-hidden /> Edit
              </button>
              <button onClick={() => toggleHidden(r)} className="btn-ghost btn-sm">
                {r.hidden ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                {r.hidden ? "Show" : "Hide"}
              </button>
              <button onClick={() => remove(r)} className="btn btn-sm border border-rose-500/40 text-rose-500 hover:bg-rose-500/10" aria-label={`Delete ${r.title}`}>
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs muted">
        Hidden courses disappear from Explore and search; direct links keep working. Featured courses
        appear in the homepage “Featured courses” section.
      </p>
    </div>
  );
}
