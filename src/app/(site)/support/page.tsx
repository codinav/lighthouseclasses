import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CreditCard, MessageCircle, MonitorSmartphone, ShieldQuestion, UserRound } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: "Support",
  description: "Help center for Lighthouse Classes — account, payments, courses, live classes, and technical help.",
};

const TOPICS = [
  { icon: UserRound, title: "Account & login", desc: "Password resets, email changes, OTP issues", href: "/faq" },
  { icon: CreditCard, title: "Payments & refunds", desc: "Invoices, EMI, coupons, 7-day guarantee", href: "/refund" },
  { icon: BookOpen, title: "Courses & certificates", desc: "Access, progress, certificate verification", href: "/faq" },
  { icon: MonitorSmartphone, title: "App & playback", desc: "Downloads, video quality, casting", href: "/faq" },
  { icon: ShieldQuestion, title: "Privacy & safety", desc: "Data, community rules, reporting", href: "/privacy" },
  { icon: MessageCircle, title: "Talk to us", desc: "Chat, email, or phone — real humans", href: "/contact" },
];

export default function SupportPage() {
  return (
    <div className="container-lh py-10 sm:py-14">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Support</p>
        <h1 className="section-title mt-4">How can we help?</h1>
        <p className="mt-3 text-base muted sm:text-lg">
          Average first reply: 47 minutes. Pick a topic or jump straight to chat from your
          dashboard.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOPICS.map((t, i) => (
          <Reveal key={t.title} delay={i * 60}>
            <Link href={t.href} className="card card-hover group block h-full p-6">
              <t.icon className="h-7 w-7 text-ocean-600 dark:text-gold-400" aria-hidden />
              <h2 className="mt-4 font-semibold group-hover:text-ocean-600 dark:group-hover:text-gold-400">{t.title}</h2>
              <p className="mt-1 text-sm muted">{t.desc}</p>
            </Link>
          </Reveal>
        ))}
      </div>

      <Reveal className="mx-auto mt-10 max-w-4xl">
        <div className="card flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-navy-900 to-ocean-800 p-6 text-white sm:p-8">
          <div>
            <h2 className="font-display text-xl font-semibold">Urgent issue during a live class?</h2>
            <p className="mt-1 text-sm text-white/70">Use the in-class “Help” button — a moderator responds in under a minute.</p>
          </div>
          <Link href="/contact" className="btn-gold btn-md">Contact support</Link>
        </div>
      </Reveal>
    </div>
  );
}
