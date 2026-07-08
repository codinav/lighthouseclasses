import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { BLOG_POSTS } from "@/lib/data";
import { Avatar } from "@/components/ui/avatar";
import { LighthouseMark } from "@/components/ui/logo";

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = BLOG_POSTS.find((p) => p.slug === params.slug);
  return post ? { title: post.title, description: post.excerpt } : {};
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = BLOG_POSTS.find((p) => p.slug === params.slug);
  if (!post) notFound();

  return (
    <article className="pb-16">
      <div className={`bg-gradient-to-br ${post.gradient} py-20 text-white`}>
        <div className="container-lh max-w-3xl">
          <Link href="/blog" className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white">
            <ChevronLeft className="h-4 w-4" aria-hidden /> The Beacon
          </Link>
          <p className="mt-6 text-2xs font-bold uppercase tracking-[0.2em] text-white/70">
            {post.category} · {post.readMin} min read
          </p>
          <h1 className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">{post.title}</h1>
          <div className="mt-6 flex items-center gap-3">
            <Avatar name="Lighthouse Editorial" className="h-10 w-10 text-xs" />
            <div>
              <p className="text-sm font-semibold">Lighthouse Editorial</p>
              <p className="text-xs text-white/70">
                {new Date(post.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-lh mt-12 max-w-3xl space-y-6 text-base leading-relaxed sm:text-lg sm:leading-loose">
        <p className="font-display text-xl leading-relaxed text-[var(--lh-ink)] sm:text-2xl">{post.excerpt}</p>
        <p className="muted">
          Language learning is not a talent lottery — it is a systems problem, and the research on
          how memory works is unambiguous. The learners who seem effortlessly fluent, who read
          Nastaliq at full speed or slip into English without translating, are almost always
          running better systems, not better hardware.
        </p>
        <p className="muted">
          At Lighthouse, we build those systems directly into the platform: vocabulary review
          scheduled on the forgetting curve, streaks that reward showing up over binging, speaking
          drills you record daily, and quizzes engineered for retrieval practice rather than
          recognition.
        </p>
        <blockquote className="rounded-3xl border-l-4 border-gold-400 bg-gold-400/5 p-6 font-display text-xl leading-relaxed">
          “The best study technique is the one that makes forgetting difficult — not the one that
          makes reading feel productive.”
        </blockquote>
        <p className="muted">
          The full editorial pipeline for The Beacon is being crafted with our faculty. Every post
          ships with practical takeaways you can apply the same evening — because inspiration
          without a next step is just entertainment.
        </p>
        <div className="card !mt-12 flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-3">
            <LighthouseMark className="h-10 w-10 text-navy-900 dark:text-white" />
            <div>
              <p className="font-display font-semibold">Enjoyed this?</p>
              <p className="text-sm muted">There's a course where this thinking lives.</p>
            </div>
          </div>
          <Link href="/courses" className="btn-gold btn-md">Explore courses</Link>
        </div>
      </div>
    </article>
  );
}
