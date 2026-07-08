"use client";

import { Download } from "lucide-react";
import { ADMIN_PAYMENTS } from "@/lib/admin-data";
import { cn, formatINR } from "@/lib/utils";

export default function AdminPaymentsPage() {
  const total = ADMIN_PAYMENTS.filter((p) => p.status === "Captured").reduce((n, p) => n + p.amount, 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Payments</h1>
          <p className="mt-1 text-sm muted">
            {formatINR(total)} captured this week · Razorpay dashboard sync (demo)
          </p>
        </div>
        <button className="btn-ghost btn-md">
          <Download className="h-4 w-4" aria-hidden /> Export CSV
        </button>
      </div>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b bg-navy-900/[0.03] text-2xs font-bold uppercase tracking-widest muted dark:bg-white/[0.03]">
              <th className="px-5 py-3.5 font-bold">Payment ID</th>
              <th className="px-5 py-3.5 font-bold">Date</th>
              <th className="px-5 py-3.5 font-bold">Student</th>
              <th className="px-5 py-3.5 font-bold">Item</th>
              <th className="px-5 py-3.5 font-bold">Method</th>
              <th className="px-5 py-3.5 text-right font-bold">Amount</th>
              <th className="px-5 py-3.5 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {ADMIN_PAYMENTS.map((p) => (
              <tr key={p.id} className="border-b border-dashed transition-colors last:border-0 hover:bg-navy-900/[0.02] dark:hover:bg-white/[0.03]">
                <td className="px-5 py-3.5 font-mono text-xs">{p.id}</td>
                <td className="px-5 py-3.5 text-xs muted">{new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                <td className="px-5 py-3.5 font-medium">{p.student}</td>
                <td className="max-w-52 truncate px-5 py-3.5 text-xs muted">{p.item}</td>
                <td className="px-5 py-3.5 text-xs">{p.method}</td>
                <td className="px-5 py-3.5 text-right font-semibold tabular-nums">{formatINR(p.amount)}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-2xs font-bold",
                      p.status === "Captured"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/10 text-rose-500"
                    )}
                  >
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
