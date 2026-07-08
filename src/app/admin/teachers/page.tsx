"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Pencil, Plus, Sparkles, Star, Trash2, X } from "lucide-react";
import { supabaseConfigured } from "@/lib/config";
import { deleteTeacherDb, upsertTeacherDb } from "@/lib/db";
import { fetchAllTeachersAdmin, invalidateTeachers, pickGradient, type MergedTeacher } from "@/lib/teachers";
import { slugify } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface FormState {
  id?: string;
  isStatic?: boolean;
  name: string;
  title: string;
  bio: string;
  long_bio: string;
  specialties: string;
  featured: boolean;
}

const emptyForm = (): FormState => ({ name: "", title: "", bio: "", long_bio: "", specialties: "", featured: false });

export default function AdminTeachersPage() {
  const connected = supabaseConfigured();
  const [teachers, setTeachers] = useState<MergedTeacher[] | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const refresh = useCallback(() => {
    invalidateTeachers();
    void fetchAllTeachersAdmin().then(setTeachers);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setMessage(null);
    if (form.name.trim().length < 3) return setMessage({ kind: "err", text: "Please enter the teacher's name." });
    if (form.title.trim().length < 3) return setMessage({ kind: "err", text: "Please add a title (e.g. “Urdu Poetry · Poet & Scholar”)." });
    setBusy(true);
    const id = form.id ?? `t-${crypto.randomUUID().slice(0, 8)}`;
    const existing = teachers?.find((t) => t.id === form.id);
    const res = await upsertTeacherDb({
      id,
      slug: existing && !existing.custom ? existing.slug : slugify(form.name),
      name: form.name.trim(),
      title: form.title.trim(),
      bio: form.bio.trim() || form.title.trim(),
      long_bio: form.long_bio.trim() || form.bio.trim(),
      specialties: form.specialties,
      gradient: existing?.gradient ?? pickGradient(teachers?.length ?? 0),
      featured: form.featured,
      hidden: existing?.hidden ?? false,
    });
    setBusy(false);
    if (res.ok) {
      setMessage({ kind: "ok", text: form.id ? "Teacher updated — live on the site now." : `${form.name.trim()} added to the faculty.` });
      setForm(null);
      refresh();
    } else {
      setMessage({ kind: "err", text: res.error ?? "Failed to save." });
    }
  };

  const toggleHidden = async (t: MergedTeacher) => {
    await upsertTeacherDb({
      id: t.id,
      slug: t.slug,
      name: t.name,
      title: t.title,
      bio: t.bio,
      long_bio: t.longBio,
      specialties: t.specialties.join(", "),
      gradient: t.gradient,
      featured: t.featured ?? false,
      hidden: !t.hidden,
    });
    refresh();
  };

  const remove = async (t: MergedTeacher) => {
    const label = t.custom ? `Delete ${t.name}?` : `Reset ${t.name} to the built-in version (removes your edits)?`;
    if (!window.confirm(label)) return;
    await deleteTeacherDb(t.id);
    setMessage({ kind: "ok", text: t.custom ? `${t.name} deleted.` : `${t.name} restored to defaults.` });
    refresh();
  };

  const startEdit = (t: MergedTeacher) => {
    setForm({
      id: t.id,
      isStatic: !t.custom,
      name: t.name,
      title: t.title,
      bio: t.bio,
      long_bio: t.longBio,
      specialties: t.specialties.join(", "),
      featured: t.featured ?? false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Teachers</h1>
          <p className="mt-1 text-sm muted">
            Add teachers, edit any profile (including the built-in faculty), feature them on the homepage, or hide them.
          </p>
        </div>
        <button onClick={() => setForm(form ? null : emptyForm())} className="btn-gold btn-md" disabled={!connected}>
          {form ? <X className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
          {form ? "Close" : "Add teacher"}
        </button>
      </div>

      {!connected && (
        <p className="card mt-4 border-gold-400/40 p-4 text-sm muted">Connect Supabase to manage teachers.</p>
      )}

      {message && (
        <p role="status" className={cn("mt-4 rounded-2xl px-4 py-2.5 text-sm font-medium", message.kind === "ok" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400")}>
          {message.text}
        </p>
      )}

      {form && (
        <form onSubmit={save} className="card mt-4 grid animate-scale-in gap-4 p-6 sm:grid-cols-2">
          <div>
            <label htmlFor="t-name" className="label-lh">Full name</label>
            <input id="t-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. Sameera Ali" className="input-lh" disabled={form.isStatic} />
            {form.isStatic && <p className="mt-1 text-2xs muted">Built-in teachers keep their name and profile URL.</p>}
          </div>
          <div>
            <label htmlFor="t-title" className="label-lh">Title</label>
            <input id="t-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Urdu Grammar · JNU" className="input-lh" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="t-bio" className="label-lh">Short bio <span className="muted">(shown on cards)</span></label>
            <input id="t-bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="One memorable sentence about this teacher." className="input-lh" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="t-long" className="label-lh">Full bio <span className="muted">(profile page)</span></label>
            <textarea id="t-long" rows={3} value={form.long_bio} onChange={(e) => setForm({ ...form, long_bio: e.target.value })} className="input-lh resize-none" />
          </div>
          <div>
            <label htmlFor="t-spec" className="label-lh">Specialties <span className="muted">(comma-separated)</span></label>
            <input id="t-spec" value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} placeholder="Nastaliq Script, Grammar, Conversation" className="input-lh" />
          </div>
          <label className="flex cursor-pointer items-center gap-3 self-end rounded-2xl border p-3.5">
            <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="h-5 w-5 accent-[#b3383c]" />
            <span className="text-sm font-semibold">Feature on homepage</span>
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className="btn-primary btn-md">
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {form.id ? "Save changes" : "Add teacher"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 space-y-3">
        {teachers === null && <div className="skeleton h-24 w-full" />}
        {(teachers ?? []).map((t) => (
          <div key={t.id} className={cn("card card-hover flex flex-wrap items-center gap-4 p-5", t.hidden && "opacity-50")}>
            <Avatar name={t.name} gradient={t.gradient} className="h-12 w-12" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">{t.name}</h2>
                {t.featured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold-400/15 px-2 py-0.5 text-2xs font-bold uppercase text-gold-600 dark:text-gold-300">
                    <Sparkles className="h-3 w-3" aria-hidden /> Featured
                  </span>
                )}
                <span className={cn("rounded-full px-2 py-0.5 text-2xs font-bold uppercase", t.custom ? "bg-ocean-600/10 text-ocean-600 dark:text-ocean-300" : "bg-navy-900/10 muted dark:bg-white/10")}>
                  {t.custom ? "Custom" : "Built-in"}
                </span>
                {t.hidden && <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-2xs font-bold uppercase text-rose-500">Hidden</span>}
              </div>
              <p className="mt-0.5 truncate text-xs muted">{t.title}</p>
              <p className="mt-0.5 flex items-center gap-3 text-xs muted">
                <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 text-gold-500" aria-hidden /> {t.rating.toFixed(1)}</span>
                <span>{t.specialties.slice(0, 3).join(" · ")}</span>
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => startEdit(t)} disabled={!connected} className="btn-ghost btn-sm">
                <Pencil className="h-4 w-4" aria-hidden /> Edit
              </button>
              <button onClick={() => toggleHidden(t)} disabled={!connected} className="btn-ghost btn-sm" aria-pressed={!t.hidden}>
                {t.hidden ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                {t.hidden ? "Show" : "Hide"}
              </button>
              <button onClick={() => remove(t)} disabled={!connected} className="btn btn-sm border border-rose-500/40 text-rose-500 hover:bg-rose-500/10" aria-label={t.custom ? `Delete ${t.name}` : `Reset ${t.name}`}>
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs muted">
        “Built-in” teachers ship with the site — editing stores an override; the delete button resets them to
        defaults. Custom teachers get a profile page automatically and appear in live-class scheduling.
      </p>
    </div>
  );
}
