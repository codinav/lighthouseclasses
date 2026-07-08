import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: "Careers",
  description: "Help us guide every learner towards excellence. Open roles at Lighthouse Classes.",
};

const ROLES = [
  { title: "Senior Urdu Faculty (Script & Grammar)", team: "Academics", location: "Mumbai / Remote", type: "Full-time" },
  { title: "Persian Language Faculty (Native/Near-native)", team: "Academics", location: "Remote", type: "Full-time" },
  { title: "IELTS & Academic English Trainer", team: "Academics", location: "Remote (India)", type: "Full-time" },
  { title: "Learning Experience Designer", team: "Product", location: "Mumbai", type: "Full-time" },
  { title: "Senior Frontend Engineer (React/Next.js)", team: "Engineering", location: "Remote (India)", type: "Full-time" },
  { title: "Video Editor — Educational Content", team: "Studio", location: "Mumbai", type: "Full-time" },
  { title: "Community & Mushaira Manager", team: "Growth", location: "Remote (India)", type: "Full-time" },
  { title: "Nastaliq Calligraphy Faculty", team: "Academics", location: "Remote", type: "Part-time" },
];

const PERKS = [
  "Teacher-first culture — educators lead product decisions",
  "Best-in-market pay, ESOPs for all full-timers",
  "Free access to every course, forever, for you and family",
  "Remote-friendly with quarterly team retreats",
  "Learning budget: ₹75,000/year, no questions asked",
  "Health cover for you, spouse, kids, and parents",
];

export default function CareersPage() {
  return (
    <div className="container-lh py-10 sm:py-14">
      <div className="max-w-2xl">
        <p className="eyebrow">Careers</p>
        <h1 className="section-title mt-4">Do your life's best work, for learners</h1>
        <p className="mt-3 text-base muted sm:text-lg">
          We're a small, senior team with a big mission. If you care deeply about education and
          craft, there's a desk (or a Zoom square) with your name on it.
        </p>
      </div>

      <Reveal className="card mt-10 p-6 sm:p-8">
        <h2 className="font-display text-xl font-semibold">Why Lighthouse</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {PERKS.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-sm leading-relaxed muted">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" aria-hidden /> {p}
            </li>
          ))}
        </ul>
      </Reveal>

      <h2 className="mt-12 font-display text-2xl font-semibold">Open roles</h2>
      <div className="mt-5 space-y-3">
        {ROLES.map((r, i) => (
          <Reveal key={r.title} delay={i * 50}>
            <Link href="/contact" className="card card-hover group flex flex-wrap items-center gap-4 p-5">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold group-hover:text-ocean-600 dark:group-hover:text-gold-400">{r.title}</h3>
                <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs muted">
                  <span className="chip !py-0.5 text-2xs">{r.team}</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" aria-hidden /> {r.location}</span>
                  <span>{r.type}</span>
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-ocean-600 transition-transform group-hover:translate-x-1 dark:text-gold-400" aria-hidden />
            </Link>
          </Reveal>
        ))}
      </div>
      <p className="mt-8 text-sm muted">
        Don't see your role? Write to{" "}
        <a href="mailto:careers@lighthouseclasses.com" className="font-semibold text-ocean-600 hover:underline dark:text-gold-400">
          careers@lighthouseclasses.com
        </a>{" "}
        — exceptional people create their own openings here.
      </p>
    </div>
  );
}
