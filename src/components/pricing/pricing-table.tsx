"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { PLANS } from "@/lib/data";
import { cn, formatINR } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";

export function PricingTable() {
  const [yearly, setYearly] = useState(true);

  return (
    <div>
      {/* Billing toggle */}
      <div className="mt-10 flex items-center justify-center gap-4">
        <span className={cn("text-sm font-semibold", !yearly ? "" : "muted")}>Monthly</span>
        <button
          role="switch"
          aria-checked={yearly}
          aria-label="Bill yearly"
          onClick={() => setYearly((v) => !v)}
          className="relative h-8 w-14 rounded-full bg-ocean-600 transition-colors"
        >
          <span className={cn("absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all", yearly ? "left-7" : "left-1")} />
        </button>
        <span className={cn("text-sm font-semibold", yearly ? "" : "muted")}>
          Yearly <span className="ml-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-2xs font-bold text-emerald-600 dark:text-emerald-400">2 months free</span>
        </span>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan, i) => {
          const price = yearly ? plan.yearly : plan.monthly;
          return (
            <Reveal key={plan.id} delay={i * 90}>
              <div
                className={cn(
                  "card relative flex h-full flex-col p-7",
                  plan.highlighted && "border-2 border-gold-400 shadow-glow lg:-translate-y-3"
                )}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-gold-400 px-4 py-1.5 text-2xs font-bold uppercase tracking-wider text-navy-950 shadow-soft">
                    <Sparkles className="h-3 w-3" aria-hidden /> Most popular
                  </span>
                )}
                <h2 className="font-display text-xl font-semibold">{plan.name}</h2>
                <p className="mt-0.5 text-sm muted">{plan.tagline}</p>
                <p className="mt-5">
                  <span className="font-display text-4xl font-bold">
                    {price === 0 ? "Free" : formatINR(yearly ? Math.round(price / 12) : price)}
                  </span>
                  {price > 0 && <span className="text-sm muted"> /month</span>}
                </p>
                {price > 0 && yearly && (
                  <p className="mt-1 text-xs muted">Billed {formatINR(price)} yearly · GST included</p>
                )}
                {price === 0 && <p className="mt-1 text-xs muted">Forever. No card needed.</p>}

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden /> {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.monthly === 0 ? "/auth/register" : `/checkout?plan=${plan.id}&billing=${yearly ? "yearly" : "monthly"}`}
                  className={cn("btn-lg mt-8 w-full", plan.highlighted ? "btn-gold" : "btn-ghost")}
                >
                  {plan.monthly === 0 ? "Start free" : `Choose ${plan.name}`}
                </Link>
              </div>
            </Reveal>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs muted">
        UPI · Cards · Net banking · EMI available on plans above ₹3,000 · Powered by Razorpay
      </p>
    </div>
  );
}
