"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Power, Tag, Trash2, X } from "lucide-react";
import { ADMIN_COUPONS } from "@/lib/admin-data";
import { supabaseConfigured } from "@/lib/config";
import { createCoupon, deleteCoupon, fetchCoupons, setCouponActive, type CouponRow } from "@/lib/db";
import { cn, formatINR } from "@/lib/utils";

interface FormState {
  code: string;
  kind: "percent" | "flat";
  value: number;
  max_uses: string; // empty = unlimited
  expires_at: string; // empty = never
}

const emptyForm = (): FormState => ({ code: "", kind: "percent", value: 10, max_uses: "", expires_at: "" });

export default function AdminCouponsPage() {
  const [rows, setRows] = useState<CouponRow[] | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const refresh = useCallback(() => {
    void fetchCoupons().then(setRows);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const live = (rows?.length ?? 0) > 0;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setMessage(null);
    const code = form.code.trim().toUpperCase().replace(/\s+/g, "");
    if (code.length < 3) return setMessage({ kind: "err", text: "Code must be at least 3 characters." });
    if (form.value <= 0) return setMessage({ kind: "err", text: "Discount value must be positive." });
    if (form.kind === "percent" && form.value > 90) return setMessage({ kind: "err", text: "Percent discounts are capped at 90%." });
    setBusy(true);
    const res = await createCoupon({
      code,
      kind: form.kind,
      value: Math.round(form.value),
      active: true,
      max_uses: form.max_uses ? Math.max(1, parseInt(form.max_uses, 10)) : null,
      expires_at: form.expires_at || null,
    });
    setBusy(false);
    if (res.ok) {
      setMessage({ kind: "ok", text: `Coupon ${code} is live — it works at checkout right now.` });
      setForm(null);
      refresh();
    } else {
      setMessage({ kind: "err", text: res.error ?? "Failed to create coupon." });
    }
  };

  const toggle = async (c: CouponRow) => {
    setRows((prev) => prev?.map((r) => (r.code === c.code ? { ...r, active: !r.active } : r)) ?? prev);
    await setCouponActive(c.code, !c.active);
  };

  const remove = async (code: string) => {
    if (!window.confirm(`Delete coupon ${code}? This can't be undone.`)) return;
    await deleteCoupon(code);
    refresh();
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Coupons</h1>
          <p className="mt-1 text-sm muted">
            {rows === null
              ? "Loading…"
              : live
                ? "Live — these codes work at checkout"
                : "No coupons yet — the built-in demo codes (LIGHT20, WELCOME10) work until you create one"}
          </p>
        </div>
        <button onClick={() => setForm(form ? null : emptyForm())} className="btn-gold btn-md" disabled={!supabaseConfigured()}>
          {form ? <X className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
          {form ? "Close" : "Create coupon"}
        </button>
      </div>

      {message && (
        <p role="status" className={cn("mt-4 rounded-2xl px-4 py-2.5 text-sm font-medium", message.kind === "ok" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400")}>
          {message.text}
        </p>
      )}

      {form && (
        <form onSubmit={save} className="card mt-4 grid animate-scale-in gap-4 p-6 sm:grid-cols-2">
          <div>
            <label htmlFor="cp-code" className="label-lh">Code</label>
            <input id="cp-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="DIWALI25" className="input-lh font-mono uppercase" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="cp-kind" className="label-lh">Type</label>
              <select id="cp-kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as "percent" | "flat" })} className="input-lh">
                <option value="percent">% off</option>
                <option value="flat">₹ off</option>
              </select>
            </div>
            <div>
              <label htmlFor="cp-value" className="label-lh">{form.kind === "percent" ? "Percent" : "Amount (₹)"}</label>
              <input id="cp-value" type="number" min={1} value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} className="input-lh" />
            </div>
          </div>
          <div>
            <label htmlFor="cp-max" className="label-lh">Usage limit <span className="muted">(blank = unlimited)</span></label>
            <input id="cp-max" type="number" min={1} value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="e.g. 100" className="input-lh" />
          </div>
          <div>
            <label htmlFor="cp-exp" className="label-lh">Expires <span className="muted">(blank = never)</span></label>
            <input id="cp-exp" type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="input-lh" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className="btn-primary btn-md">
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Create coupon
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {rows === null && <div className="skeleton h-40 w-full sm:col-span-2" />}

        {/* Live coupons */}
        {(rows ?? []).map((c) => {
          const expired = c.expires_at && new Date(c.expires_at).getTime() < Date.now();
          const exhausted = c.max_uses !== null && c.used_count >= c.max_uses;
          const state = expired ? "Expired" : exhausted ? "Exhausted" : c.active ? "Active" : "Paused";
          return (
            <div key={c.code} className={cn("card p-5", state !== "Active" && "opacity-70")}>
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-400/15">
                  <Tag className="h-5 w-5 text-gold-600 dark:text-gold-300" aria-hidden />
                </span>
                <span className={cn("rounded-full px-2.5 py-1 text-2xs font-bold", state === "Active" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-navy-900/10 muted dark:bg-white/10")}>
                  {state}
                </span>
              </div>
              <p className="mt-3 font-mono text-lg font-bold tracking-wider">{c.code}</p>
              <p className="text-sm muted">{c.kind === "percent" ? `${c.value}% off` : `${formatINR(c.value)} off`}</p>
              <div className="mt-4 border-t pt-3 text-xs muted">
                <div className="flex justify-between">
                  <span>Redemptions</span>
                  <span className="font-semibold text-[var(--lh-ink)] tabular-nums">
                    {new Intl.NumberFormat("en-IN").format(c.used_count)}
                    {c.max_uses ? ` / ${new Intl.NumberFormat("en-IN").format(c.max_uses)}` : " · unlimited"}
                  </span>
                </div>
                {c.max_uses && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-navy-900/10 dark:bg-white/10">
                    <div className="h-full rounded-full bg-ocean-600" style={{ width: `${Math.min(100, (c.used_count / c.max_uses) * 100)}%` }} />
                  </div>
                )}
                <p className="mt-2">
                  {c.expires_at ? `Expires ${new Date(c.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}` : "No expiry"}
                </p>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => toggle(c)} className="btn-ghost btn-sm flex-1">
                  <Power className="h-4 w-4" aria-hidden /> {c.active ? "Pause" : "Activate"}
                </button>
                <button onClick={() => remove(c.code)} className="btn btn-sm border border-rose-500/40 text-rose-500 hover:bg-rose-500/10" aria-label={`Delete ${c.code}`}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          );
        })}

        {/* Demo fallback display */}
        {rows !== null && rows.length === 0 &&
          ADMIN_COUPONS.map((c) => (
            <div key={c.code} className={cn("card p-5", c.status === "Expired" && "opacity-60")}>
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-400/15">
                  <Tag className="h-5 w-5 text-gold-600 dark:text-gold-300" aria-hidden />
                </span>
                <span className="rounded-full bg-navy-900/10 px-2.5 py-1 text-2xs font-bold uppercase muted dark:bg-white/10">Demo</span>
              </div>
              <p className="mt-3 font-mono text-lg font-bold tracking-wider">{c.code}</p>
              <p className="text-sm muted">{c.discount}</p>
            </div>
          ))}
      </div>
    </div>
  );
}
