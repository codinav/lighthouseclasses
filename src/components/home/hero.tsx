"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { courseHref, fetchMergedCourses } from "@/lib/courses";
import type { Course } from "@/lib/types";

const QUICK_CHIPS = ["Urdu Script", "Ghazal", "Spoken English", "Persian", "IELTS"];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Soft gold aura */}
      <div className="absolute inset-0 bg-hero-radial" aria-hidden />
      <div
        className="absolute -top-32 right-[-10%] h-96 w-96 rounded-full bg-gold-400/10 blur-3xl"
        aria-hidden
      />

      <div className="container-lh relative grid min-h-[88vh] items-center gap-12 pb-20 pt-24 lg:grid-cols-[1.1fr_0.9fr] lg:pb-28">
        {/* Copy */}
        <div className="max-w-2xl">
          <p className="eyebrow animate-fade-up">
            <Sparkles className="h-3 w-3" aria-hidden /> Urdu · English · Persian
          </p>
          <h1
            className="mt-6 animate-fade-up font-display text-4xl font-semibold leading-[1.1] sm:text-5xl lg:text-[3.6rem]"
            style={{ animationDelay: "100ms" }}
          >
            Every language deserves{" "}
            <span className="relative whitespace-nowrap text-ocean-600 dark:text-gold-400">
              a guiding light.
              <svg
                className="absolute -bottom-2 left-0 w-full text-gold-400"
                viewBox="0 0 220 10"
                preserveAspectRatio="none"
                aria-hidden
              >
                <path d="M2 8 C60 2 160 2 218 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
              </svg>
            </span>
          </h1>
          <p
            className="mt-6 animate-fade-up text-base leading-relaxed muted sm:text-lg"
            style={{ animationDelay: "200ms" }}
          >
            Learn Urdu, English, and Persian from ustads and scholars who&apos;ve changed thousands
            of lives — script, conversation, poetry, and calligraphy. Live classes, structured
            courses, and mentorship, guided every step of the way.
          </p>

          <HeroSearch />

          <div className="mt-6 flex animate-fade-up flex-wrap items-center gap-3" style={{ animationDelay: "400ms" }}>
            <Link href="/auth/register" className="btn-ocean btn-lg">
              Start learning free <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/courses" className="btn-ghost btn-lg">
              Browse courses
            </Link>
          </div>

          <dl className="mt-10 flex animate-fade-up flex-wrap gap-x-10 gap-y-4 border-t pt-6" style={{ animationDelay: "500ms" }}>
            {[
              ["3", "Languages, taught deeply"],
              ["Live", "Classes with real teachers"],
              ["Free", "Starter lessons in every course"],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="sr-only">{l}</dt>
                <dd className="font-display text-2xl font-bold text-ocean-600 dark:text-gold-400">{v}</dd>
                <dd className="text-xs uppercase tracking-widest muted">{l}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Lighthouse scene */}
        <div className="relative mx-auto hidden w-full max-w-md lg:block" aria-hidden>
          <LighthouseScene />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function HeroSearch() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [catalog, setCatalog] = useState<Course[]>([]);
  const router = useRouter();

  useEffect(() => {
    void fetchMergedCourses().then(setCatalog);
  }, []);

  const q = query.trim().toLowerCase();
  const suggestions = q
    ? catalog.filter((c) => c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)).slice(0, 4)
    : [];

  return (
    <div className="relative mt-8 animate-fade-up" style={{ animationDelay: "300ms" }}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/courses${query ? `?q=${encodeURIComponent(query)}` : ""}`);
        }}
        className="flex items-center gap-2 rounded-full border bg-[var(--lh-card)] p-2 pl-5 shadow-soft transition-all focus-within:border-ocean-400 focus-within:shadow-lifted"
      >
        <Search className="h-5 w-5 shrink-0 muted" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="What do you want to learn today?"
          className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--lh-ink-soft)] sm:text-base"
          aria-label="Search courses"
        />
        <button type="submit" className="btn-ocean btn-sm shrink-0 sm:btn-md">
          Search
        </button>
      </form>

      {focused && suggestions.length > 0 && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 animate-scale-in overflow-hidden rounded-3xl border bg-[var(--lh-card)] shadow-lifted">
          {suggestions.map((c) => (
            <button
              key={c.slug}
              type="button"
              onMouseDown={() => router.push(courseHref(c))}
              className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-ocean-600/5 dark:hover:bg-white/5"
            >
              <Search className="h-4 w-4 shrink-0 muted" aria-hidden />
              <span className="truncate text-sm">{c.title}</span>
              <span className="ml-auto shrink-0 text-2xs uppercase tracking-wider muted">{c.category}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-2xs uppercase tracking-widest muted">Trending:</span>
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => router.push(`/courses?q=${encodeURIComponent(chip)}`)}
            className="chip hover:border-ocean-500 hover:text-ocean-600 dark:hover:text-gold-400"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function LighthouseScene() {
  return (
    <div className="relative aspect-[4/5]">
      {/* Rotating beam */}
      <div className="absolute left-1/2 top-[26%] h-3 w-[130%] origin-left animate-beam" style={{ transformOrigin: "0% 50%" }}>
        <div className="h-full w-full rounded-full bg-gradient-to-r from-gold-400/80 via-gold-400/25 to-transparent blur-[2px]" />
      </div>

      {/* Glow */}
      <div className="absolute left-1/2 top-[26%] h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-400/50 blur-xl" />
      <div className="absolute left-1/2 top-[26%] h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-pulse-ring rounded-full border-2 border-gold-400" />

      <svg viewBox="0 0 320 400" className="relative h-full w-full drop-shadow-xl">
        {/* Sun-disc backdrop */}
        <circle cx="160" cy="150" r="118" className="fill-gold-400/10" />
        <circle cx="160" cy="150" r="88" className="fill-gold-400/10" />

        {/* Rocks */}
        <path d="M56 344 Q104 306 160 326 Q224 304 270 348 L282 400 L38 400 Z" fill="#37302a" />
        <path d="M92 352 Q140 322 200 340 Q240 328 252 356 L258 400 L74 400 Z" fill="#211c17" />

        {/* Tower */}
        <path d="M138 132 h44 L200 340 h-80 Z" fill="#ffffff" />
        <path d="M138 132 h22 L142 340 h-22 Z" fill="#ece5d8" opacity="0.7" />
        {/* Stripes */}
        <path d="M133.5 168 h53 l3 26 h-59 Z" fill="#b3383c" />
        <path d="M128 226 h64 l3 26 h-70 Z" fill="#b3383c" />
        <path d="M122 288 h76 l3.4 26 h-82.6 Z" fill="#b3383c" />

        {/* Gallery + lantern */}
        <rect x="130" y="118" width="60" height="10" rx="4" fill="#211c17" />
        <rect x="142" y="86" width="36" height="34" rx="4" fill="#f4b400" />
        <rect x="150" y="90" width="8" height="26" rx="2" fill="#fff7c2" opacity="0.9" />
        <path d="M160 54 L192 88 h-64 Z" fill="#211c17" />
        <circle cx="160" cy="52" r="5" fill="#f4b400" />

        {/* Door + windows */}
        <rect x="150" y="306" width="20" height="34" rx="9" fill="#211c17" />
        <rect x="154" y="206" width="12" height="16" rx="5" fill="#211c17" opacity="0.85" />
        <rect x="152" y="146" width="14" height="16" rx="5" fill="#211c17" opacity="0.85" />
      </svg>

      {/* Waves */}
      <div className="absolute inset-x-[-30%] bottom-2 h-14 overflow-hidden" style={{ maskImage: "linear-gradient(to right, transparent, black 18%, black 82%, transparent)" }}>
        <svg viewBox="0 0 800 60" className="h-full w-[200%] animate-waves" preserveAspectRatio="none">
          <path
            d="M0 30 Q50 8 100 30 T200 30 T300 30 T400 30 T500 30 T600 30 T700 30 T800 30 V60 H0 Z"
            fill="#b3383c"
            opacity="0.35"
          />
        </svg>
      </div>

      {/* Floating feature cards */}
      <div className="card absolute -left-6 top-[38%] animate-float px-4 py-3 shadow-lifted">
        <p className="text-2xs uppercase tracking-widest muted">Live classes</p>
        <p className="mt-0.5 text-sm font-bold">Monthly Mushaira</p>
        <p className="text-2xs font-semibold text-ocean-600 dark:text-gold-400">Poetry, read together</p>
      </div>
      <div className="card absolute -right-4 top-[62%] animate-float px-4 py-3 shadow-lifted" style={{ animationDelay: "1.4s" }}>
        <p className="text-2xs uppercase tracking-widest muted">Learn daily</p>
        <p className="mt-0.5 text-sm font-bold">🔥 Build a streak</p>
        <p className="text-2xs font-semibold text-ocean-600 dark:text-gold-400">Progress you can see</p>
      </div>
    </div>
  );
}
