"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Crown, Loader2, Pencil, ShieldCheck, ShieldX, UserPlus } from "lucide-react";
import { ADMIN_SECTIONS, MASTER_ADMIN_EMAILS, supabaseConfigured } from "@/lib/config";
import { fetchAdmins, grantAdmin, revokeAdmin, type ProfileRow } from "@/lib/db";
import { useAuth } from "@/lib/providers";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/** Multi-select dropdown for admin sections. Empty selection = full access. */
function SectionsDropdown({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const full = value.length === 0;
  const label = full
    ? "Full access (all sections)"
    : `${value.length} section${value.length === 1 ? "" : "s"}: ${ADMIN_SECTIONS.filter((s) => value.includes(s.key)).map((s) => s.label).slice(0, 3).join(", ")}${value.length > 3 ? "…" : ""}`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="input-lh flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="truncate text-sm">{label}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 muted transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="absolute z-30 mt-2 w-full animate-scale-in rounded-2xl border bg-[var(--lh-card)] p-2 shadow-lifted" role="listbox">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-navy-900/5 dark:hover:bg-white/5">
            <input
              type="checkbox"
              checked={full}
              onChange={() => onChange([])}
              className="h-4 w-4 accent-[#b3383c]"
            />
            <span className="text-sm font-bold">Full access — every section</span>
          </label>
          <div className="my-1 border-t" />
          {ADMIN_SECTIONS.map((s) => (
            <label key={s.key} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-navy-900/5 dark:hover:bg-white/5">
              <input
                type="checkbox"
                checked={!full && value.includes(s.key)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...value.filter((k) => k !== s.key), s.key]
                    : value.filter((k) => k !== s.key);
                  onChange(next);
                }}
                className="h-4 w-4 accent-[#b3383c]"
              />
              <span className="text-sm">{s.label}</span>
            </label>
          ))}
          <p className="border-t px-3 pb-1 pt-2 text-2xs muted">
            Untick everything to give full access. Team stays master-only.
          </p>
        </div>
      )}
    </div>
  );
}

export default function AdminTeamPage() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<ProfileRow[] | null>(null);
  const [email, setEmail] = useState("");
  const [sections, setSections] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null); // email being edited
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const refresh = useCallback(() => {
    void fetchAdmins().then(setAdmins);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (user?.role !== "master") {
    return (
      <div className="card flex flex-col items-center gap-3 p-12 text-center">
        <ShieldX className="h-10 w-10 text-rose-500" aria-hidden />
        <h1 className="font-display text-2xl font-semibold">Master admin only</h1>
        <p className="max-w-sm text-sm muted">Only the master admin can grant or revoke access.</p>
      </div>
    );
  }

  const sectionsOf = (row: ProfileRow): string[] =>
    (row.admin_sections ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  const grant = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = (editing ?? email).trim().toLowerCase();
    setMessage(null);
    if (!/^\S+@\S+\.\S+$/.test(target)) {
      setMessage({ kind: "err", text: "Please enter a valid email address." });
      return;
    }
    if (MASTER_ADMIN_EMAILS.some((m) => m.toLowerCase() === target)) {
      setMessage({ kind: "err", text: "That email is already a master admin." });
      return;
    }
    setBusy(true);
    const res = await grantAdmin(target, sections);
    setBusy(false);
    if (res.ok) {
      const scope = sections.length === 0 ? "full admin access" : `access to: ${ADMIN_SECTIONS.filter((s) => sections.includes(s.key)).map((s) => s.label).join(", ")}`;
      setMessage({ kind: "ok", text: `${target} now has ${scope}.${editing ? "" : " If they haven't signed up yet, it activates on their first sign-in."}` });
      setEmail("");
      setSections([]);
      setEditing(null);
      refresh();
    } else {
      setMessage({ kind: "err", text: res.error ?? "Couldn't grant access." });
    }
  };

  const revoke = async (target: string) => {
    if (!window.confirm(`Remove all admin access for ${target}?`)) return;
    setMessage(null);
    const res = await revokeAdmin(target);
    if (res.ok) {
      setMessage({ kind: "ok", text: `Admin access revoked for ${target}.` });
      refresh();
    } else {
      setMessage({ kind: "err", text: res.error ?? "Couldn't revoke access." });
    }
  };

  const startEdit = (row: ProfileRow) => {
    setEditing(row.email);
    setEmail(row.email);
    setSections(sectionsOf(row));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">Team</h1>
      <p className="mt-1 text-sm muted">
        Grant admin access to any email — and choose exactly which sections they can manage.
      </p>

      {!supabaseConfigured() && (
        <p className="card mt-6 border-gold-400/40 p-5 text-sm muted">
          Supabase isn't configured, so grants can't be stored.
        </p>
      )}

      {/* Grant / edit form */}
      <form onSubmit={grant} className="card mt-6 space-y-4 p-6">
        <p className="label-lh flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-ocean-600 dark:text-gold-400" aria-hidden />
          {editing ? `Editing access for ${editing}` : "Grant admin access"}
        </p>
        <div>
          <label htmlFor="grant-email" className="label-lh">Email</label>
          <input
            id="grant-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teacher@example.com"
            className="input-lh"
            disabled={!!editing}
          />
        </div>
        <div>
          <label className="label-lh">Sections they can access</label>
          <SectionsDropdown value={sections} onChange={setSections} />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={busy || (!editing && !email.trim())} className="btn-gold btn-md">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
            {editing ? "Save access" : "Grant access"}
          </button>
          {editing && (
            <button type="button" onClick={() => { setEditing(null); setEmail(""); setSections([]); }} className="btn-ghost btn-md">
              Cancel
            </button>
          )}
        </div>
        <p className="text-xs muted">
          Works even before they create an account — access activates on their first sign-in (email or Google).
        </p>
        {message && (
          <p
            role="status"
            className={cn(
              "rounded-2xl px-4 py-2.5 text-sm font-medium",
              message.kind === "ok" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            )}
          >
            {message.text}
          </p>
        )}
      </form>

      {/* Masters */}
      <h2 className="mt-8 font-display text-lg font-semibold">Master admins</h2>
      <p className="text-xs muted">Full control of everything, including this page. Managed in src/lib/config.ts.</p>
      <div className="mt-3 space-y-2">
        {MASTER_ADMIN_EMAILS.map((m) => (
          <div key={m} className="card flex items-center gap-3 p-4">
            <Avatar name={m} className="h-10 w-10 text-xs" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{m}</span>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gold-400/15 px-3 py-1 text-2xs font-bold uppercase tracking-wider text-gold-600 dark:text-gold-300">
              <Crown className="h-3 w-3" aria-hidden /> Master
            </span>
          </div>
        ))}
      </div>

      {/* Limited admins */}
      <h2 className="mt-8 font-display text-lg font-semibold">Admins</h2>
      <div className="mt-3 space-y-2">
        {admins === null && <div className="skeleton h-16 w-full" />}
        {admins !== null && admins.length === 0 && (
          <p className="card border-dashed p-6 text-center text-sm muted">No admins yet — grant access above.</p>
        )}
        {(admins ?? []).map((a) => {
          const secs = sectionsOf(a);
          return (
            <div key={a.email} className="card flex flex-wrap items-center gap-3 p-4">
              <Avatar name={a.name} src={a.avatar_url ?? undefined} className="h-10 w-10 text-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{a.name}</p>
                <p className="truncate text-xs muted">{a.email}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {secs.length === 0 ? (
                    <span className="rounded-full bg-ocean-600/10 px-2 py-0.5 text-2xs font-bold text-ocean-600 dark:text-ocean-300">Full access</span>
                  ) : (
                    ADMIN_SECTIONS.filter((s) => secs.includes(s.key)).map((s) => (
                      <span key={s.key} className="rounded-full bg-navy-900/5 px-2 py-0.5 text-2xs font-semibold muted dark:bg-white/10">
                        {s.label}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <button onClick={() => startEdit(a)} className="btn-ghost btn-sm shrink-0">
                <Pencil className="h-4 w-4" aria-hidden /> Edit
              </button>
              <button
                onClick={() => revoke(a.email)}
                className="btn btn-sm shrink-0 border border-rose-500/40 text-rose-500 hover:bg-rose-500/10"
              >
                Revoke
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
