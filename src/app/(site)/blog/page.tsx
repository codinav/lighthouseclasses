import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BLOG_POSTS } from "@/lib/data";
import { Reveal } from "@/components/ui/reveal";
import { LighthouseMark } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Blog — The Beacon",
  description: "Study science, success stories, and the craft of learning — from the Lighthouse Classes team.",
};

export default function BlogPage() {
  const [featured, ...rest] = BLOG_POSTS;

  return (
    <div className="container-lh py-10 sm:py-14">
      <div className="max-w-2xl">
        <p className="eyebrow">The Beacon</p>
        <h1 className="section-title mt-4">Ideas that light the way</h1>
        <p className="mt-3 text-base muted sm:text-lg">
          Study science, honest success stories, and teaching craft — written by our faculty and
          learning designers.
        </p>
      </div>

      {/* Featured */}
      <Reveal className="mt-10">
        <Link href={`/blog/${featured.slug}`} className="card card-hover group grid overflow-hidden lg:grid-cols-2">
          <div className={`relative flex min-h-56 items-center justify-center bg-gradient-to-br ${featured.gradient}`}>
            <LighthouseMark className="h-20 w-20 text-white/90" />
          </div>
          <div className="flex flex-col justify-center p-7 sm:p-10">
            <p className="text-2xs font-bold uppercase tracking-widest text-ocean-600 dark:text-gold-400">
              {featured.category} · {featured.readMin} min read
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold leading-snug group-hover:text-ocean-600 dark:group-hover:text-gold-400 sm:text-3xl">
              {featured.title}
            </h2>
            <p className="mt-3 leading-relaxed muted">{featured.excerpt}</p>
            <p className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-ocean-600 dark:text-gold-400">
              Read the story <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </p>
          </div>
        </Link>
      </Reveal>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((post, i) => (
          <Reveal key={post.slug} delay={i * 70}>
            <Link href={`/blog/${post.slug}`} className="card card-hover group flex h-full flex-col overflow-hidden">
              <div className={`flex h-36 items-center justify-center bg-gradient-to-br ${post.gradient}`}>
                <LighthouseMark className="h-12 w-12 text-white/90" />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="text-2xs font-bold uppercase tracking-widest text-ocean-600 dark:text-gold-400">
                  {post.category} · {post.readMin} min
                </p>
                <h2 className="mt-2 font-display text-lg font-semibold leading-snug group-hover:text-ocean-600 dark:group-hover:text-gold-400">
                  {post.title}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed muted">{post.excerpt}</p>
                <p className="mt-4 text-xs muted">
                  {new Date(post.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
