"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BadgeCheck, Check, Heart, PlayCircle, Share2 } from "lucide-react";
import type { Course } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
import { useAuth } from "@/lib/providers";
import { isEnrolled } from "@/lib/enrollments";
import { learnHref } from "@/lib/courses";

export function EnrollCard({ course }: { course: Course }) {
  const { user } = useAuth();
  const [wishlisted, setWishlisted] = useState(false);
  const [shared, setShared] = useState(false);
  const [owned, setOwned] = useState(false);
  const [price, setPrice] = useState(course.price);

  useEffect(() => {
    try {
      const list: string[] = JSON.parse(localStorage.getItem("lh_wishlist") ?? "[]");
      setWishlisted(list.includes(course.slug));
    } catch {}
    if (user) setOwned(isEnrolled(user.email, course.slug));
    setPrice(course.price);
  }, [course.slug, course.price, user]);

  const toggleWishlist = () => {
    try {
      const list: string[] = JSON.parse(localStorage.getItem("lh_wishlist") ?? "[]");
      const next = list.includes(course.slug) ? list.filter((s) => s !== course.slug) : [...list, course.slug];
      localStorage.setItem("lh_wishlist", JSON.stringify(next));
      setWishlisted(next.includes(course.slug));
    } catch {}
  };

  const share = async () => {
    const url = `${location.origin}/courses/${course.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: course.title, text: course.subtitle, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {}
  };

  const discount = Math.max(0, Math.round((1 - price / course.originalPrice) * 100));

  return (
    <div className="card overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-3xl font-bold">{formatINR(price)}</span>
          <span className="text-sm line-through muted">{formatINR(course.originalPrice)}</span>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {discount}% off
          </span>
        </div>
        <p className="mt-1.5 text-xs font-semibold text-rose-500">Offer ends soon · EMI available</p>

        <div className="mt-5 space-y-2.5">
          {owned ? (
            <>
              <p className="flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                <BadgeCheck className="h-4 w-4" aria-hidden /> You're enrolled in this course
              </p>
              <Link href={learnHref(course)} className="btn-gold btn-lg w-full">
                <PlayCircle className="h-5 w-5" aria-hidden /> Continue learning
              </Link>
              <Link href="/dashboard/my-courses" className="btn-ghost btn-md w-full">
                View in My Courses
              </Link>
            </>
          ) : (
            <>
              <Link href={`/checkout?course=${course.slug}`} className="btn-gold btn-lg w-full">
                Enroll now
              </Link>
              <Link href={learnHref(course)} className="btn-ghost btn-lg w-full">
                <PlayCircle className="h-5 w-5" aria-hidden /> Watch free preview
              </Link>
            </>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={toggleWishlist}
            aria-pressed={wishlisted}
            className={cn("btn-ghost btn-md flex-1", wishlisted && "!border-rose-400 text-rose-500")}
          >
            <Heart className={cn("h-4 w-4", wishlisted && "fill-current")} aria-hidden />
            {wishlisted ? "Wishlisted" : "Wishlist"}
          </button>
          <button onClick={share} className="btn-ghost btn-md flex-1">
            {shared ? <Check className="h-4 w-4 text-emerald-500" aria-hidden /> : <Share2 className="h-4 w-4" aria-hidden />}
            {shared ? "Link copied" : "Share"}
          </button>
        </div>

        <p className="mt-4 text-center text-xs muted">7-day refund guarantee · Lifetime access</p>
      </div>

      <div className="border-t bg-navy-900/[0.03] p-5 dark:bg-white/[0.03] sm:p-6">
        <p className="text-2xs font-bold uppercase tracking-widest muted">This course includes</p>
        <ul className="mt-3 space-y-2">
          {course.includes.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
