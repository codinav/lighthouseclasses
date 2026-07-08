"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Database, Download, Search, Trash2 } from "lucide-react";
import { ADMIN_STUDENTS } from "@/lib/admin-data";
import { isMasterEmail } from "@/lib/config";
import { deleteProfile, fetchAllEnrollments, fetchProfiles, updateProfilePlan, type ProfileRow } from "@/lib/db";
import { fetchMergedCourses } from "@/lib/courses";
import { useAuth } from "@/lib/providers";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Row {
  name: string;
  email: string;
  avatarUrl?: string;
  provider: string;
  phone: string;
  plan: string;
  courses: number;
  courseList: string[];
  joined: string;
  lastActive: string;
  role: string;
  updates: boolean;
}

function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function AdminStudentsPage() {
  const { user } = useAuth();
  const isMaster = user?.role === "master";
  const [q, setQ] = useState("");

  const removeStudent = async (email: string, name: string) => {
    if (!window.confirm(`Delete ${name} (${email})? Their profile, enrollments, and progress are removed permanently.`)) return;
    const res = await deleteProfile(email);
    if (res.ok) setRows((prev) => prev?.filter((r) => r.email !== email) ?? prev);
  };
  const [rows, setRows] = useState<Row[] | null>(null); // null = loading
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchProfiles(), fetchAllEnrollments(), fetchMergedCourses()]).then(([profiles, enrolls, courses]) => {
      if (cancelled) return;
      const titleBySlug = new Map(courses.map((c) => [c.slug, c.title]));
      const coursesByEmail = new Map<string, string[]>();
      for (const e of enrolls) {
        const arr = coursesByEmail.get(e.email) ?? [];
        const title = titleBySlug.get(e.course_slug) ?? e.course_slug;
        if (!arr.includes(title)) arr.push(title);
        coursesByEmail.set(e.email, arr);
      }
      if (profiles.length > 0) {
        setRows(
          profiles.map((p: ProfileRow) => {
            const list = coursesByEmail.get(p.email) ?? [];
            return {
              name: p.name,
              email: p.email,
              avatarUrl: p.avatar_url ?? undefined,
              provider: p.provider,
              phone: p.phone ?? "",
              plan: p.plan,
              courses: list.length,
              courseList: list,
              joined: p.created_at,
              lastActive: relative(p.last_active_at),
              role: p.role,
              updates: p.marketing_opt_in ?? true,
            };
          })
        );
        setLive(true);
      } else {
        setRows(
          ADMIN_STUDENTS.map((s) => ({
            name: s.name,
            email: s.email,
            provider: "email",
            phone: "",
            plan: s.plan,
            courses: s.courses,
            courseList: [],
            joined: s.joined,
            lastActive: s.lastActive,
            role: "student",
            updates: true,
          }))
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = (rows ?? []).filter((s) =>
    (s.name + s.email + s.phone + s.plan + s.provider + s.courseList.join(" ")).toLowerCase().includes(q.toLowerCase())
  );
  const [copied, setCopied] = useState(false);
  const subscribers = (rows ?? []).filter((s) => s.updates);

  const copyEmails = async () => {
    try {
      await navigator.clipboard.writeText(subscribers.map((s) => s.email).join(", "));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const exportCsv = () => {
    const header = "Name,Email,Phone,Sign-in,Plan,Courses,Enrolled in,Joined,Class updates";
    const lines = (rows ?? []).map((s) =>
      [
        s.name.replace(/,/g, " "),
        s.email,
        s.phone,
        s.provider,
        s.plan,
        s.courses,
        `"${s.courseList.join("; ")}"`,
        new Date(s.joined).toLocaleDateString("en-IN"),
        s.updates ? "Yes" : "No",
      ].join(",")
    );
    const blob = new Blob([header + "\n" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lighthouse-students-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Students</h1>
          <p className="mt-1 flex items-center gap-2 text-sm muted">
            <Database className="h-3.5 w-3.5" aria-hidden />
            {rows === null
              ? "Loading accounts…"
              : live
                ? `${rows.length} real account${rows.length === 1 ? "" : "s"} · live from Supabase`
                : "Demo data — real accounts appear here as people sign up"}
            {live && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <button onClick={copyEmails} className="btn-ghost btn-sm" title="Copy the email addresses of everyone opted into class updates">
            {copied ? <Check className="h-4 w-4 text-emerald-500" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            {copied ? "Copied!" : `Copy emails (${subscribers.length})`}
          </button>
          <button onClick={exportCsv} className="btn-ghost btn-sm">
            <Download className="h-4 w-4" aria-hidden /> Export CSV
          </button>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 muted" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search students…" className="input-lh !rounded-full pl-11" aria-label="Search students" />
          </div>
        </div>
      </div>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b bg-navy-900/[0.03] text-2xs font-bold uppercase tracking-widest muted dark:bg-white/[0.03]">
              <th className="px-5 py-3.5 font-bold">Student</th>
              <th className="px-5 py-3.5 font-bold">Sign-in</th>
              <th className="px-5 py-3.5 font-bold">Plan</th>
              <th className="px-5 py-3.5 font-bold">Courses</th>
              <th className="px-5 py-3.5 font-bold">Joined</th>
              <th className="px-5 py-3.5 font-bold">Last active</th>
              <th className="px-5 py-3.5 font-bold">Updates</th>
              {isMaster && <th className="px-5 py-3.5 font-bold"><span className="sr-only">Delete</span></th>}
            </tr>
          </thead>
          <tbody>
            {(rows === null ? [] : filtered).map((s) => (
              <tr key={s.email} className="border-b border-dashed transition-colors last:border-0 hover:bg-navy-900/[0.02] dark:hover:bg-white/[0.03]">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.name} src={s.avatarUrl} className="h-9 w-9 text-xs" />
                    <div>
                      <p className="font-semibold">
                        {s.name}
                        {isMasterEmail(s.email) ? (
                          <span className="ml-2 rounded-full bg-gold-400/15 px-2 py-0.5 text-2xs font-bold uppercase text-gold-600 dark:text-gold-300">Master</span>
                        ) : s.role === "admin" ? (
                          <span className="ml-2 rounded-full bg-ocean-600/10 px-2 py-0.5 text-2xs font-bold uppercase text-ocean-600 dark:text-ocean-300">Admin</span>
                        ) : null}
                      </p>
                      <p className="text-xs muted">{s.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="chip !py-0.5 text-2xs capitalize">{s.provider}</span>
                </td>
                <td className="px-5 py-3.5">
                  {live ? (
                    <select
                      value={s.plan}
                      onChange={(e) => {
                        const plan = e.target.value;
                        setRows((prev) => prev?.map((r) => (r.email === s.email ? { ...r, plan } : r)) ?? prev);
                        void updateProfilePlan(s.email, plan);
                      }}
                      aria-label={`Plan for ${s.name}`}
                      className={cn(
                        "cursor-pointer rounded-full border-0 px-2.5 py-1 text-2xs font-bold outline-none",
                        s.plan === "Lighthouse" && "bg-gold-400/15 text-gold-600 dark:text-gold-300",
                        s.plan === "Beacon" && "bg-ocean-600/10 text-ocean-600 dark:text-ocean-300",
                        s.plan === "Spark" && "bg-navy-900/10 muted dark:bg-white/10"
                      )}
                    >
                      <option value="Spark">Spark</option>
                      <option value="Beacon">Beacon</option>
                      <option value="Lighthouse">Lighthouse</option>
                    </select>
                  ) : (
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-2xs font-bold",
                        s.plan === "Lighthouse" && "bg-gold-400/15 text-gold-600 dark:text-gold-300",
                        s.plan === "Beacon" && "bg-ocean-600/10 text-ocean-600 dark:text-ocean-300",
                        s.plan === "Spark" && "bg-navy-900/10 muted dark:bg-white/10"
                      )}
                    >
                      {s.plan}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 tabular-nums">{s.courses}</td>
                <td className="px-5 py-3.5 text-xs muted">
                  {new Date(s.joined).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td className="px-5 py-3.5 text-xs muted">{s.lastActive}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-2xs font-bold",
                      s.updates ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-navy-900/10 muted dark:bg-white/10"
                    )}
                  >
                    {s.updates ? "✓ Subscribed" : "Opted out"}
                  </span>
                </td>
                {isMaster && (
                  <td className="px-5 py-3.5">
                    {!isMasterEmail(s.email) && live && (
                      <button
                        onClick={() => removeStudent(s.email, s.name)}
                        className="btn-ghost h-8 w-8 rounded-full !p-0 text-rose-500"
                        aria-label={`Delete ${s.name}`}
                        title="Delete student (master only)"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {rows === null && (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-12 w-full" />
            ))}
          </div>
        )}
        {rows !== null && filtered.length === 0 && <p className="p-8 text-center text-sm muted">No students match “{q}”.</p>}
      </div>
    </div>
  );
}
