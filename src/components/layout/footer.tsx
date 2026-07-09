import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { APP_VERSION } from "@/lib/config";

const COLUMNS = [
  {
    title: "Learn",
    links: [
      { label: "All Courses", href: "/courses" },
      { label: "Live Classes", href: "/live" },
      { label: "Urdu Dictionary", href: "/dictionary" },
      { label: "Platts Dictionary", href: "/platts" },
      { label: "Teachers", href: "/teachers" },
      { label: "Pricing", href: "/pricing" },
      { label: "Verify Certificate", href: "/certificates/verify" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
      { label: "Community", href: "/community" },
      { label: "Get the App", href: "/app" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", href: "/support" },
      { label: "FAQ", href: "/faq" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Refund Policy", href: "/refund" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden bg-navy-950 pb-28 pt-16 text-white lg:pb-16">
      {/* Beam sweep */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-ocean-600/20 blur-3xl"
        aria-hidden
      />
      <div className="container-lh relative">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Logo textClassName="text-white" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
              Guiding every learner towards excellence. World-class teachers, thoughtfully crafted
              courses, and a learning experience built with care in India.
            </p>
            <div className="mt-6 flex gap-3">
              {["twitter", "instagram", "youtube", "linkedin"].map((s) => (
                <a
                  key={s}
                  href={`https://${s}.com/lighthouseclasses`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Lighthouse Classes on ${s}`}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-xs font-bold uppercase text-white/70 transition-colors hover:border-gold-400 hover:text-gold-400"
                >
                  {s[0]}
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="font-sans text-2xs font-bold uppercase tracking-[0.2em] text-gold-400">
                  {col.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-white/65 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 border-t border-white/10 pt-8 text-center">
          <p className="text-xs text-white/50">
            Designed &amp; developed by{" "}
            <span className="font-semibold text-gold-400">Abhinav Saxena</span>
            <span className="ml-2 text-white/30">{APP_VERSION}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
