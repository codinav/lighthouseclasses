import Link from "next/link";
import { Logo, LighthouseMark } from "@/components/ui/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-navy-950 p-12 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-hero-radial" aria-hidden />
        <Link href="/" className="relative">
          <Logo textClassName="text-white" />
        </Link>
        <div className="relative my-auto max-w-md">
          <LighthouseMark className="h-20 w-20 animate-float text-white" />
          <h1 className="mt-8 font-display text-4xl font-semibold leading-tight">
            Every great journey begins with <span className="text-gradient-gold">a single letter.</span>
          </h1>
          <p className="mt-4 leading-relaxed text-white/60">
            Learn Urdu, English, and Persian with India's finest ustads — script, conversation, and
            poetry. Your streak, your pace, your path, guided all the way.
          </p>
          <ul className="mt-10 space-y-3 text-sm text-white/70">
            {["Live classes with real teachers", "Free starter lessons in every course", "Two free dictionaries — Urdu lughat & Platts (1884)"].map((line) => (
              <li key={line} className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/40">© {new Date().getFullYear()} Lighthouse Classes</p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-col bg-[var(--lh-bg)] px-5 py-8 sm:px-12 sm:py-10">
        <div className="flex items-center justify-between lg:justify-end">
          <Link href="/" className="lg:hidden">
            <Logo />
          </Link>
          <Link href="/" className="text-sm font-semibold text-ocean-600 hover:underline dark:text-gold-400">
            ← Back to home
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
