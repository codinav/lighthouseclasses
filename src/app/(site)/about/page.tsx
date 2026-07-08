import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Eye, HeartHandshake, Lightbulb } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { LighthouseMark } from "@/components/ui/logo";
import { TeamSection } from "@/components/home/team-section";

export const metadata: Metadata = {
  title: "About Us",
  description: "Why we built Lighthouse Classes — the story, the values, and the people guiding every learner towards excellence.",
};

const VALUES = [
  { icon: Eye, title: "Clarity over cleverness", text: "If a student doesn't understand, the explanation failed — not the student. We rewrite until it clicks." },
  { icon: Compass, title: "Guidance, not gatekeeping", text: "Great education shouldn't depend on your pin code. We price honestly and give scholarships generously." },
  { icon: HeartHandshake, title: "Teachers first", text: "We pay teachers like the professionals they are, and give them time to craft — not churn — their courses." },
  { icon: Lightbulb, title: "Steady light", text: "No dark patterns, no fake urgency, no gamified addiction. Motivation built on progress, not anxiety." },
];

const TIMELINE = [
  { year: "The idea", event: "One conviction: the languages we love — Urdu, English, Persian — deserve teaching this good online. Guided, live, personal." },
  { year: "The platform", event: "Courses built around ustads, not content dumps. Live classes, structured lessons, and a community that reads poetry together." },
  { year: "The dictionaries", event: "Two free dictionaries launch — a modern Urdu lughat and the complete Platts (1884) with 56,000+ entries — open to everyone, forever." },
];

export default function AboutPage() {
  return (
    <div className="pb-16">
      <div className="bg-navy-950 py-20 text-white">
        <div className="container-lh grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Our story</p>
            <h1 className="section-title mt-4">
              Built for everyone who loves a language <span className="text-gradient-gold">from a distance.</span>
            </h1>
            <p className="mt-5 leading-relaxed text-white/65">
              Lighthouse Classes began with a simple observation: millions of people love Urdu
              poetry they can't read, speak English they can't voice, and quote Rumi in
              translations that lose his music. The internet is full of content but starved of
              guidance — and a language is not learned from content dumps. It's learned from
              ustads. We started with the three languages of our own hearts — Urdu, English, and
              Persian — and built the platform we wished existed: guided, live, personal. The name
              is the mission — a lighthouse doesn't move the ship. It makes the way visible.
            </p>
          </div>
          <div className="hidden justify-center lg:flex" aria-hidden>
            <LighthouseMark className="h-64 w-64 animate-float text-white" />
          </div>
        </div>
      </div>

      <div className="container-lh -mt-8">
        <Reveal className="card grid grid-cols-3 gap-6 p-8">
          {[
            ["3", "Languages taught"],
            ["56,000+", "Dictionary entries, free"],
            ["Live", "Classes with real teachers"],
          ].map(([v, l]) => (
            <div key={l} className="text-center">
              <p className="font-display text-2xl font-bold sm:text-4xl">{v}</p>
              <p className="mt-1 text-2xs uppercase tracking-widest muted">{l}</p>
            </div>
          ))}
        </Reveal>
      </div>

      <section className="container-lh mt-16">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">What we believe</p>
          <h2 className="section-title mt-4">Four values, non-negotiable</h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {VALUES.map((v, i) => (
            <Reveal key={v.title} delay={i * 70}>
              <div className="card card-hover h-full p-7">
                <v.icon className="h-7 w-7 text-ocean-600 dark:text-gold-400" aria-hidden />
                <h3 className="mt-4 font-display text-lg font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed muted">{v.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <TeamSection />

      <section className="container-lh mt-16 max-w-3xl">
        <Reveal>
          <p className="eyebrow">The journey</p>
          <h2 className="section-title mt-4">Small light, growing brighter</h2>
        </Reveal>
        <div className="mt-8 space-y-0 border-l-2 border-gold-400/40 pl-8">
          {TIMELINE.map((t, i) => (
            <Reveal key={t.year} delay={i * 80} className="relative pb-8">
              <span className="absolute -left-[41px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-gold-400 bg-[var(--lh-bg)]">
                <span className="h-2 w-2 rounded-full bg-gold-400" />
              </span>
              <p className="font-display text-xl font-bold text-gold-600 dark:text-gold-400">{t.year}</p>
              <p className="mt-1 leading-relaxed muted">{t.event}</p>
            </Reveal>
          ))}
        </div>
        <Reveal className="card mt-6 flex flex-wrap items-center justify-between gap-4 p-6">
          <p className="font-display text-lg font-semibold">Want to be part of the story?</p>
          <div className="flex gap-2">
            <Link href="/careers" className="btn-ghost btn-md">We're hiring</Link>
            <Link href="/auth/register" className="btn-gold btn-md">Start learning</Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
