"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Award, BookOpen, Compass, Download, HeartHandshake, MonitorPlay, Route, Smartphone, Sparkles, Users } from "lucide-react";
import { CATEGORIES, FAQS } from "@/lib/data";
import { fetchMergedCourses } from "@/lib/courses";
import type { Course } from "@/lib/types";
import { formatCompact } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";
import { DynamicIcon } from "@/components/ui/icon";
import { CourseCard } from "@/components/course/course-card";
import { LiveClassCard } from "@/components/live/live-card";
import { fetchMergedLiveClasses } from "@/lib/live-classes";
import { fetchVisibleTeachers, teacherHref } from "@/lib/teachers";
import type { LiveClass, Teacher } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { Rating } from "@/components/ui/rating";
import { Counter } from "@/components/ui/counter";
import { Accordion } from "@/components/ui/accordion";
import { LighthouseMark } from "@/components/ui/logo";

/* ------------------------------------------------------------------ */
/* Section shell                                                       */
/* ------------------------------------------------------------------ */

export function SectionHeading({
  eyebrow,
  title,
  sub,
  center,
}: {
  eyebrow: string;
  title: React.ReactNode;
  sub?: string;
  center?: boolean;
}) {
  return (
    <Reveal className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="section-title mt-4">{title}</h2>
      {sub && <p className="mt-4 text-base leading-relaxed muted sm:text-lg">{sub}</p>}
    </Reveal>
  );
}

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export function Categories() {
  return (
    <section className="container-lh py-16 sm:py-24">
      <SectionHeading
        eyebrow="Explore the languages"
        title="Three languages, one tradition"
        sub="Urdu, English, and Persian — from your first letter to your first ghazal, guided by teachers who've spent decades mastering their craft."
      />
      <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {CATEGORIES.map((cat, i) => (
          <Reveal key={cat.name} delay={i * 60}>
            <Link
              href={`/courses?category=${encodeURIComponent(cat.name)}`}
              className="card card-hover group flex flex-col gap-4 p-5 sm:p-6"
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${cat.gradient} text-white shadow-soft transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
              >
                <DynamicIcon name={cat.icon} className="h-6 w-6" />
              </span>
              <span>
                <span className="block font-display text-base font-semibold leading-tight sm:text-lg">
                  {cat.name}
                </span>
                <span className="mt-1 block text-xs font-semibold text-ocean-600 dark:text-gold-400">Explore →</span>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Featured courses                                                    */
/* ------------------------------------------------------------------ */

export function FeaturedCourses() {
  // Admin-driven: courses marked "Feature on homepage" in /admin/courses.
  // Falls back to the newest courses when none are featured; hides entirely
  // while the catalog is empty.
  const [courses, setCourses] = useState<Course[] | null>(null);
  useEffect(() => {
    void fetchMergedCourses().then((all) => {
      const featured = all.filter((c) => c.featured);
      setCourses((featured.length > 0 ? featured : all).slice(0, 6));
    });
  }, []);

  if (courses !== null && courses.length === 0) return null;

  return (
    <section className="bg-navy-900/[0.03] py-16 dark:bg-white/[0.02] sm:py-24">
      <div className="container-lh">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Featured courses"
            title="Start with our signature courses"
            sub="Hand-picked programs — from your first Nastaliq letters to reading ghazals in the original."
          />
          <Reveal delay={150}>
            <Link href="/courses" className="btn-ghost btn-md whitespace-nowrap">
              View all courses <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Reveal>
        </div>

        {/* Horizontal scroll on mobile, grid on desktop */}
        <div className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 scrollbar-none sm:gap-6 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
          {courses === null &&
            [0, 1, 2].map((i) => <div key={i} className="skeleton h-80 w-[82vw] max-w-sm shrink-0 sm:w-96 lg:w-auto lg:max-w-none" />)}
          {(courses ?? []).map((course, i) => (
            <Reveal key={course.slug} delay={i * 80} className="w-[82vw] max-w-sm shrink-0 snap-start sm:w-96 lg:w-auto lg:max-w-none">
              <CourseCard course={course} className="h-full" />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Why Lighthouse                                                      */
/* ------------------------------------------------------------------ */

const WHY = [
  { icon: Compass, title: "Guided, not dumped", text: "No content dumps. Every course is a sequenced journey with checkpoints, mentors, and a clear line to your goal." },
  { icon: MonitorPlay, title: "Live & interactive", text: "Weekly live classes with chat, polls, and raise-hand. Ask your question and get an answer — that day." },
  { icon: Route, title: "Adaptive paths", text: "Your dashboard recalibrates around your pace, streaks, and quiz results. The plan bends; the goal doesn't." },
  { icon: Award, title: "Verified certificates", text: "Every completion earns a certificate with a public verification ID that employers and colleges can check." },
  { icon: HeartHandshake, title: "Mentors who care", text: "Flagship programs include monthly 1-on-1 mentorship — a real teacher who knows your name and your weak chapters." },
  { icon: Download, title: "Learn anywhere", text: "Offline downloads, background audio, and a full-featured mobile experience. Your commute is now a classroom." },
];

export function WhyUs() {
  return (
    <section className="container-lh py-16 sm:py-24">
      <SectionHeading
        center
        eyebrow="Why Lighthouse"
        title="Built like a lighthouse: steady, bright, and always on"
        sub="We obsess over the details that keep you learning — so the platform never gets in the way of the teaching."
      />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {WHY.map((item, i) => (
          <Reveal key={item.title} delay={i * 70}>
            <div className="card card-hover h-full p-6 sm:p-7">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-ocean-600 to-navy-800 text-white shadow-soft">
                <item.icon className="h-6 w-6" aria-hidden />
              </span>
              <h3 className="mt-5 font-display text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed muted">{item.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Teachers                                                            */
/* ------------------------------------------------------------------ */

export function FeaturedTeachers() {
  // Admin-driven: teachers marked "featured" in /admin/teachers.
  const [faculty, setFaculty] = useState<Teacher[] | null>(null);
  useEffect(() => {
    void fetchVisibleTeachers().then((all) => {
      const featured = all.filter((t) => t.featured);
      setFaculty((featured.length > 0 ? featured : all).slice(0, 4));
    });
  }, []);

  if (faculty !== null && faculty.length === 0) return null;

  return (
    <section className="container-lh py-16 sm:py-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow="Meet the faculty"
          title="Teachers worth crossing oceans for"
          sub="Learn from ustads and scholars at the top of their craft — script, conversation, and poetry."
        />
        <Reveal delay={150}>
          <Link href="/teachers" className="btn-ghost btn-md whitespace-nowrap">
            All teachers <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Reveal>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        {faculty === null &&
          [0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-56 rounded-3xl" />)}
        {(faculty ?? []).map((t, i) => (
          <Reveal key={t.slug} delay={i * 80}>
            <Link href={teacherHref(t)} className="card card-hover group block h-full p-6">
              <Avatar name={t.name} gradient={t.gradient} className="h-16 w-16 text-xl" />
              <h3 className="mt-4 font-display text-lg font-semibold group-hover:text-ocean-600 dark:group-hover:text-gold-400">
                {t.name}
              </h3>
              <p className="mt-0.5 text-xs muted">{t.title}</p>
              <p className="mt-3 line-clamp-2 text-sm muted">{t.bio}</p>
              <div className="mt-4 flex items-center justify-between border-t pt-4 text-xs font-semibold text-ocean-600 dark:text-gold-400">
                View profile <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function HomeLive() {
  const [classes, setClasses] = useState<LiveClass[] | null>(null);
  useEffect(() => {
    void fetchMergedLiveClasses().then(({ classes }) => setClasses(classes.slice(0, 3)));
  }, []);

  if (classes !== null && classes.length === 0) return null;

  return (
    <section className="container-lh py-16 sm:py-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow="Live this week"
          title="Learn together, in real time"
          sub="Interactive classes with live chat, polls, and doubt-solving. Recordings included for members."
        />
        <Reveal delay={150}>
          <Link href="/live" className="btn-ghost btn-md whitespace-nowrap">
            Full schedule <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Reveal>
      </div>
      <div className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 scrollbar-none lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
        {classes === null &&
          [0, 1, 2].map((i) => <div key={i} className="skeleton h-64 w-[82vw] max-w-sm shrink-0 sm:w-96 lg:w-auto lg:max-w-none" />)}
        {(classes ?? []).map((lc, i) => (
          <Reveal key={lc.id} delay={i * 80} className="w-[82vw] max-w-sm shrink-0 snap-start sm:w-96 lg:w-auto lg:max-w-none">
            <LiveClassCard lc={lc} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

const STATS = [
  { value: 120000, suffix: "+", label: "Learners guided", icon: Users },
  { value: 40, suffix: "+", label: "Courses & programs", icon: BookOpen },
  { value: 92, suffix: "%", label: "Course completion rate", icon: Sparkles },
  { value: 21000, suffix: "+", label: "Certificates issued", icon: Award },
];

export function Stats() {
  return (
    <section className="container-lh py-16 sm:py-20">
      <div className="card relative overflow-hidden p-8 sm:p-12">
        <div className="absolute -right-10 -top-10 opacity-[0.06] dark:opacity-[0.09]" aria-hidden>
          <LighthouseMark className="h-64 w-64" />
        </div>
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 80} className="text-center">
              <s.icon className="mx-auto h-6 w-6 text-ocean-600 dark:text-gold-400" aria-hidden />
              <p className="mt-3 font-display text-3xl font-bold sm:text-4xl">
                <Counter to={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-1 text-xs uppercase tracking-widest muted">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* App download                                                        */
/* ------------------------------------------------------------------ */

export function AppDownload() {
  return (
    <section className="container-lh py-16 sm:py-24">
      <Reveal>
        <div className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-navy-900 via-navy-800 to-ocean-800 p-8 text-white sm:p-14">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gold-400/20 blur-3xl" aria-hidden />
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="eyebrow">Learn on the go</p>
              <h2 className="section-title mt-4">Your pocket lighthouse</h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-white/70">
                Download lessons for offline viewing, keep your streak alive with 5-minute daily
                goals, and join live classes from anywhere. Android, iOS — and this site installs
                as an app too.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {[
                  { store: "Google Play", note: "GET IT ON" },
                  { store: "App Store", note: "DOWNLOAD ON THE" },
                ].map((s) => (
                  <a
                    key={s.store}
                    href="#"
                    className="btn rounded-2xl border border-white/20 bg-white/10 px-5 py-3 backdrop-blur transition-all hover:border-gold-400/50 hover:bg-white/15"
                  >
                    <Smartphone className="h-5 w-5 text-gold-400" aria-hidden />
                    <span className="text-left leading-tight">
                      <span className="block text-2xs text-white/60">{s.note}</span>
                      <span className="block text-sm font-bold">{s.store}</span>
                    </span>
                  </a>
                ))}
              </div>
            </div>

            {/* Phone mock */}
            <div className="mx-auto w-56 sm:w-64" aria-hidden>
              <div className="animate-float rounded-[2.4rem] border border-white/20 bg-navy-950/80 p-2.5 shadow-lifted backdrop-blur">
                <div className="rounded-[1.9rem] bg-gradient-to-b from-navy-900 to-navy-950 p-4">
                  <div className="mx-auto h-1 w-16 rounded-full bg-white/20" />
                  <p className="mt-5 text-2xs uppercase tracking-widest text-white/40">Good evening, Aarav</p>
                  <p className="mt-1 font-display text-lg font-semibold">Continue learning</p>
                  <div className="mt-3 rounded-2xl bg-gradient-to-br from-ocean-600 to-navy-800 p-3.5">
                    <p className="text-2xs text-white/70">Urdu Script · Lesson 11</p>
                    <p className="mt-0.5 text-sm font-bold">Aerab: reading without vowel marks</p>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/20">
                      <div className="h-full w-2/3 rounded-full bg-gold-400" />
                    </div>
                    <p className="mt-1.5 text-2xs text-white/60">67% complete</p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <div className="flex-1 rounded-2xl bg-white/10 p-3">
                      <p className="text-lg font-bold text-gold-400">🔥 12</p>
                      <p className="text-2xs text-white/60">Day streak</p>
                    </div>
                    <div className="flex-1 rounded-2xl bg-white/10 p-3">
                      <p className="text-lg font-bold text-gold-400">2,840</p>
                      <p className="text-2xs text-white/60">XP earned</p>
                    </div>
                  </div>
                  <div className="mt-3 h-10 rounded-2xl bg-white/5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ + final CTA                                                     */
/* ------------------------------------------------------------------ */

export function HomeFAQ() {
  return (
    <section className="container-lh py-16 sm:py-24">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <SectionHeading
          eyebrow="Questions"
          title="Everything you're wondering"
          sub="Can't find your answer? Our support crew replies within hours, not days."
        />
        <Reveal delay={120}>
          <Accordion items={FAQS.slice(0, 6).map((f) => ({ title: f.q, content: f.a }))} />
        </Reveal>
      </div>
    </section>
  );
}

export function FinalCTA() {
  return (
    <section className="container-lh pb-8 pt-8 sm:pt-16">
      <Reveal>
        <div className="relative overflow-hidden rounded-4xl bg-navy-950 px-6 py-16 text-center text-white sm:px-12 sm:py-20">
          <div className="absolute inset-0 bg-hero-radial" aria-hidden />
          <div className="relative mx-auto max-w-2xl">
            <LighthouseMark className="mx-auto h-14 w-14 text-white" />
            <h2 className="section-title mt-6">
              The light is on. <span className="text-gradient-gold">Come learn.</span>
            </h2>
            <p className="mt-4 text-base text-white/65 sm:text-lg">
              Learn Urdu, English, and Persian — with free starter lessons in every course. No
              credit card, no pressure — just a brighter path.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/auth/register" className="btn-gold btn-lg">
                Create free account <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/pricing" className="btn-ghost btn-lg border-white/25 text-white hover:bg-white/10">
                See pricing
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
