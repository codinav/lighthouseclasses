"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { fetchVisibleTeachers, teacherHref } from "@/lib/teachers";
import type { Teacher } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { Reveal } from "@/components/ui/reveal";

/**
 * "Meet the team" on /about — driven by the teachers managed in
 * /admin/teachers. Hides itself entirely until a teacher exists.
 */
export function TeamSection() {
  const [team, setTeam] = useState<Teacher[] | null>(null);
  useEffect(() => {
    void fetchVisibleTeachers().then((all) => setTeam(all));
  }, []);

  if (team !== null && team.length === 0) return null;

  return (
    <section className="container-lh mt-16">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Meet the team</p>
        <h2 className="section-title mt-4">The people holding the light</h2>
        <p className="mt-3 text-sm muted sm:text-base">
          The teachers and mentors behind every lesson, every live class, and every reply.
        </p>
      </Reveal>
      <div className="mx-auto mt-10 grid max-w-4xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {team === null && [0, 1, 2].map((i) => <div key={i} className="skeleton h-64 rounded-3xl" />)}
        {(team ?? []).map((m, i) => (
          <Reveal key={m.id} delay={i * 80}>
            <Link href={teacherHref(m)} className="card card-hover group flex h-full flex-col p-7 text-center">
              <Avatar name={m.name} gradient={m.gradient} className="mx-auto h-20 w-20 text-2xl" />
              <h3 className="mt-4 font-display text-lg font-semibold group-hover:text-ocean-600 dark:group-hover:text-gold-400">
                {m.name}
              </h3>
              <p className="mt-1 inline-block self-center rounded-full bg-gold-400/15 px-3 py-0.5 text-2xs font-bold uppercase tracking-wider text-gold-700 dark:text-gold-300">
                {m.title}
              </p>
              <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed muted">{m.bio}</p>
              <span className="mt-4 inline-flex items-center justify-center gap-1 text-xs font-semibold text-ocean-600 dark:text-gold-400">
                View profile <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
