import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { ContactForm } from "@/components/misc/contact-form";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Questions, feedback, or partnership ideas — the Lighthouse Classes crew replies within hours.",
};

const CHANNELS = [
  { icon: Mail, title: "Email", value: "hello@lighthouseclasses.com", note: "Replies within 4 hours, 9 AM – 9 PM IST" },
  { icon: Phone, title: "Phone", value: "+91 90000 12345", note: "Mon–Sat, 9 AM – 7 PM IST" },
  { icon: MessageCircle, title: "Live chat", value: "In the app & dashboard", note: "Fastest for account and payment issues" },
  { icon: MapPin, title: "Office", value: "WeWork, BKC, Mumbai 400051", note: "Visits by appointment" },
];

export default function ContactPage() {
  return (
    <div className="container-lh py-10 sm:py-14">
      <div className="max-w-2xl">
        <p className="eyebrow">Contact</p>
        <h1 className="section-title mt-4">Talk to a human</h1>
        <p className="mt-3 text-base muted sm:text-lg">
          No ticket black holes. Real people, quick answers — whether you're a student, parent, or
          future teacher.
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-4">
          {CHANNELS.map((c, i) => (
            <Reveal key={c.title} delay={i * 60}>
              <div className="card flex gap-4 p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ocean-600/10 text-ocean-600 dark:bg-gold-400/15 dark:text-gold-400">
                  <c.icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-bold">{c.title}</p>
                  <p className="text-sm">{c.value}</p>
                  <p className="mt-0.5 text-xs muted">{c.note}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120}>
          <ContactForm />
        </Reveal>
      </div>
    </div>
  );
}
