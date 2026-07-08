"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  CalendarClock,
  ChevronLeft,
  CreditCard,
  Loader2,
  Lock,
  Smartphone,
  Tag,
} from "lucide-react";
import { PLANS } from "@/lib/data";
import { courseHref, findCourseMerged, learnHref } from "@/lib/courses";
import type { Course } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
import { useAuth } from "@/lib/providers";
import { enroll } from "@/lib/enrollments";
import { recordCouponUse, updateProfilePlan, validateCoupon } from "@/lib/db";
import { Logo } from "@/components/ui/logo";
import { CourseCover } from "@/components/ui/course-cover";
import { AuthGate } from "@/components/auth/auth-gate";

const METHODS = [
  { id: "upi", label: "UPI", note: "GPay, PhonePe, Paytm & more", icon: Smartphone },
  { id: "card", label: "Credit / Debit Card", note: "Visa, Mastercard, RuPay, Amex", icon: CreditCard },
  { id: "netbanking", label: "Net Banking", note: "All major Indian banks", icon: Building2 },
  { id: "emi", label: "EMI", note: "3–12 months, from ₹417/mo", icon: CalendarClock },
];

export default function CheckoutPage() {
  return (
    <AuthGate>
      <Suspense>
        <Checkout />
      </Suspense>
    </AuthGate>
  );
}

function Checkout() {
  const params = useSearchParams();
  const { user } = useAuth();
  const courseSlug = params.get("course") ?? "";
  const [course, setCourse] = useState<Course | undefined>(undefined);
  useEffect(() => {
    if (courseSlug) {
      void findCourseMerged(courseSlug).then((c) => c && setCourse(c));
    }
  }, [courseSlug]);
  const plan = PLANS.find((p) => p.id === params.get("plan"));
  const billing = params.get("billing") === "monthly" ? "monthly" : "yearly";

  const item = course
    ? { title: course.title, sub: "Lifetime access · Certificate included", price: course.price, original: course.originalPrice }
    : plan
      ? {
          title: `${plan.name} Plan (${billing})`,
          sub: "Auto-renews · Cancel anytime",
          price: billing === "yearly" ? plan.yearly : plan.monthly,
          original: billing === "yearly" ? plan.monthly * 12 : null,
        }
      : { title: "Beacon Plan (yearly)", sub: "Auto-renews · Cancel anytime", price: 6999, original: 8388 };

  const [method, setMethod] = useState("upi");
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<{ code: string; pct: number; flat?: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState("");
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  const discount = applied ? (applied.flat ?? Math.round((item.price * applied.pct) / 100)) : 0;
  const base = item.price - discount;
  // Prices are GST-inclusive; show the tax component for the invoice
  const gst = Math.round(base - base / 1.18);
  const total = base;

  const applyCoupon = async () => {
    const code = coupon.trim().toUpperCase();
    if (!code) return;
    // Real coupons from the admin panel take priority
    const result = await validateCoupon(code, item.price);
    if (result) {
      if (result.ok) {
        setApplied({ code: result.code, pct: Math.round((result.discount / item.price) * 100), flat: result.discount });
        setCouponMsg("");
      } else {
        setApplied(null);
        setCouponMsg(result.error);
      }
      return;
    }
    // No coupons configured — reject everything else honestly.
    setApplied(null);
    setCouponMsg("That code isn't valid.");
  };

  const pay = async () => {
    setPaying(true);
    // Production: create order via POST /api/payments/order, then open Razorpay
    // Checkout with the returned order_id — see docs/API.md.
    await new Promise((r) => setTimeout(r, 1800));
    // Record the purchase — instantly in My Courses (local), mirrored to Supabase
    if (user) {
      if (course) enroll(user.email, course.slug, "purchase");
      else if (plan) void updateProfilePlan(user.email, plan.name);
    }
    if (applied) void recordCouponUse(applied.code);
    setPaying(false);
    setPaid(true);
  };

  const invoiceId = useMemo(() => `INV-2026-${String(Math.floor(1000 + Math.random() * 9000))}`, []);

  if (paid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--lh-bg)] p-5">
        <div className="card w-full max-w-md animate-scale-in p-8 text-center sm:p-10">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
            <BadgeCheck className="h-10 w-10 text-emerald-500" aria-hidden />
          </span>
          <h1 className="mt-6 font-display text-3xl font-semibold">Payment successful</h1>
          <p className="mt-2 text-sm muted">
            {course ? "You're enrolled! The course is already in your dashboard." : "Your plan is active. Every course is now unlocked."}
          </p>
          <dl className="mt-6 space-y-2 rounded-2xl border bg-navy-900/[0.03] p-4 text-left text-sm dark:bg-white/[0.03]">
            <div className="flex justify-between"><dt className="muted">Invoice</dt><dd className="font-mono text-xs">{invoiceId}</dd></div>
            <div className="flex justify-between"><dt className="muted">Item</dt><dd className="font-semibold">{item.title}</dd></div>
            <div className="flex justify-between"><dt className="muted">Paid</dt><dd className="font-bold">{formatINR(total)}</dd></div>
          </dl>
          <p className="mt-3 text-2xs muted">A GST invoice has been emailed to you.</p>
          <div className="mt-6 grid gap-2">
            <Link href={course ? learnHref(course) : "/dashboard"} className="btn-gold btn-lg w-full">
              {course ? "Start learning now" : "Go to dashboard"}
            </Link>
            <Link href="/dashboard/my-courses" className="btn-ghost btn-md w-full">
              View in My Courses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--lh-bg)] pb-16">
      <header className="border-b bg-[var(--lh-card)]">
        <div className="container-lh flex h-16 items-center justify-between">
          <Link href={course ? courseHref(course) : "/pricing"} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean-600 hover:underline dark:text-gold-400">
            <ChevronLeft className="h-4 w-4" aria-hidden /> Back
          </Link>
          <Logo />
          <span className="inline-flex items-center gap-1.5 text-xs muted">
            <Lock className="h-3.5 w-3.5" aria-hidden /> Secure checkout
          </span>
        </div>
      </header>

      <main className="container-lh mt-10 grid max-w-5xl gap-8 lg:grid-cols-[1.2fr_1fr]">
        {/* Payment methods */}
        <section aria-labelledby="pay-h">
          <h1 id="pay-h" className="font-display text-2xl font-semibold">Choose payment method</h1>
          <div className="mt-5 space-y-3">
            {METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                aria-pressed={method === m.id}
                className={cn(
                  "card flex w-full items-center gap-4 p-4 text-left transition-all sm:p-5",
                  method === m.id ? "border-2 border-ocean-500 shadow-glow-ocean" : "card-hover"
                )}
              >
                <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", method === m.id ? "bg-ocean-600 text-white" : "bg-ocean-600/10 text-ocean-600")}>
                  <m.icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-bold">{m.label}</span>
                  <span className="text-xs muted">{m.note}</span>
                </span>
                <span className={cn("h-5 w-5 rounded-full border-2", method === m.id ? "border-ocean-600 bg-ocean-600 shadow-[inset_0_0_0_3px_var(--lh-card)]" : "border-navy-900/20 dark:border-white/20")} aria-hidden />
              </button>
            ))}
          </div>

          {method === "upi" && (
            <div className="card mt-4 animate-fade-up p-5">
              <label htmlFor="upi-id" className="label-lh">UPI ID</label>
              <div className="flex gap-2">
                <input id="upi-id" placeholder="yourname@upi" className="input-lh" />
                <button className="btn-ghost btn-md shrink-0">Verify</button>
              </div>
            </div>
          )}
          {method === "card" && (
            <div className="card mt-4 grid animate-fade-up gap-4 p-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="cc-num" className="label-lh">Card number</label>
                <input id="cc-num" placeholder="1234 5678 9012 3456" inputMode="numeric" autoComplete="cc-number" className="input-lh" />
              </div>
              <div>
                <label htmlFor="cc-exp" className="label-lh">Expiry</label>
                <input id="cc-exp" placeholder="MM/YY" autoComplete="cc-exp" className="input-lh" />
              </div>
              <div>
                <label htmlFor="cc-cvv" className="label-lh">CVV</label>
                <input id="cc-cvv" placeholder="•••" inputMode="numeric" autoComplete="cc-csc" className="input-lh" />
              </div>
            </div>
          )}
        </section>

        {/* Order summary */}
        <aside>
          <div className="card sticky top-6 overflow-hidden">
            {course && <CourseCover gradient={course.gradient} icon={course.icon} thumbnail={course.thumbnail} className="aspect-[3/1]" iconClassName="h-8 w-8" />}
            <div className="p-6">
              <h2 className="font-display text-lg font-semibold">Order summary</h2>
              <div className="mt-4 flex items-start justify-between gap-3 border-b pb-4">
                <div>
                  <p className="text-sm font-bold">{item.title}</p>
                  <p className="text-xs muted">{item.sub}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatINR(item.price)}</p>
                  {item.original && <p className="text-xs line-through muted">{formatINR(item.original)}</p>}
                </div>
              </div>

              {/* Coupon */}
              <div className="mt-4">
                <label htmlFor="coupon" className="label-lh flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" aria-hidden /> Coupon code
                </label>
                <div className="flex gap-2">
                  <input
                    id="coupon"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    placeholder="LIGHT20"
                    className="input-lh uppercase"
                  />
                  <button onClick={applyCoupon} className="btn-ghost btn-md shrink-0">Apply</button>
                </div>
                {applied && (
                  <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    ✓ {applied.code} applied — {applied.pct}% off
                  </p>
                )}
                {couponMsg && <p className="mt-2 text-xs text-rose-500">{couponMsg}</p>}
              </div>

              <dl className="mt-5 space-y-2 border-t pt-4 text-sm">
                <div className="flex justify-between"><dt className="muted">Subtotal</dt><dd>{formatINR(item.price)}</dd></div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <dt>Coupon discount</dt><dd>−{formatINR(discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between"><dt className="muted">GST (18%, included)</dt><dd className="muted">{formatINR(gst)}</dd></div>
                <div className="flex justify-between border-t pt-3 text-base font-bold">
                  <dt>Total</dt><dd>{formatINR(total)}</dd>
                </div>
              </dl>

              <button onClick={pay} disabled={paying} className="btn-gold btn-lg mt-6 w-full">
                {paying ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
                {paying ? "Processing…" : `Pay ${formatINR(total)}`}
              </button>
              <p className="mt-3 text-center text-2xs muted">
                256-bit encrypted · Powered by Razorpay · 7-day refund guarantee
              </p>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
