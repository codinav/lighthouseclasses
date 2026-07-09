"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, LogOut, Menu, Moon, Search, Sun, User, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Avatar } from "@/components/ui/avatar";
import { useAuth, useTheme } from "@/lib/providers";
import { cn } from "@/lib/utils";
import { courseHref, fetchMergedCourses } from "@/lib/courses";
import type { Course } from "@/lib/types";

const NAV = [
  { href: "/courses", label: "Courses" },
  { href: "/live", label: "Live" },
  { href: "/platts", label: "Platts Dictionary" },
  { href: "/teachers", label: "Teachers" },
  { href: "/pricing", label: "Pricing" },
  { href: "/community", label: "Community" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [userMenu, setUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setUserMenu(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenu(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <>
      <header
        className={cn(
          "safe-top fixed inset-x-0 top-0 z-50 transition-all duration-300",
          scrolled ? "glass shadow-soft" : "bg-transparent"
        )}
      >
        <div className="container-lh flex h-16 items-center justify-between gap-3">
          <Link href="/" aria-label="Lighthouse Classes — home" className="shrink-0">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith(item.href)
                    ? "bg-navy-900/5 text-ocean-600 dark:bg-white/10 dark:text-gold-400"
                    : "muted hover:bg-navy-900/5 hover:text-[var(--lh-ink)] dark:hover:bg-white/5"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              className="btn-ghost h-10 w-10 rounded-full !p-0"
              onClick={() => setSearchOpen(true)}
              aria-label="Search courses"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>
            <button
              className="btn-ghost h-10 w-10 rounded-full !p-0"
              onClick={toggle}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>

            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenu((v) => !v)}
                  aria-label="Account menu"
                  aria-expanded={userMenu}
                  className="rounded-full transition-transform active:scale-95"
                >
                  <Avatar name={user.name} src={user.avatarUrl} className="h-10 w-10 ring-2 ring-gold-400/60" />
                </button>
                {userMenu && (
                  <div className="absolute right-0 top-12 w-64 animate-scale-in rounded-3xl border bg-[var(--lh-card)] p-2 shadow-lifted">
                    <div className="border-b px-4 py-3">
                      <p className="text-sm font-semibold">{user.name}</p>
                      <p className="text-xs muted">{user.email}</p>
                      <span className="mt-1.5 inline-block rounded-full bg-gold-400/15 px-2 py-0.5 text-2xs font-bold uppercase tracking-wider text-gold-600 dark:text-gold-300">
                        {user.plan} plan
                      </span>
                    </div>
                    <div className="p-1.5">
                      <Link href="/dashboard" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-navy-900/5 dark:hover:bg-white/5">
                        <User className="h-4 w-4 text-ocean-600" /> Dashboard
                      </Link>
                      <Link href="/dashboard/notifications" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-navy-900/5 dark:hover:bg-white/5">
                        <Bell className="h-4 w-4 text-ocean-600" /> Notifications
                      </Link>
                      <button
                        onClick={logout}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-500 hover:bg-rose-500/10"
                      >
                        <LogOut className="h-4 w-4" /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/auth/login" className="btn-ghost btn-sm hidden sm:inline-flex">
                  Log in
                </Link>
                <Link href="/auth/register" className="btn-gold btn-sm">
                  Start free
                </Link>
              </>
            )}

            <button
              className="btn-ghost h-10 w-10 rounded-full !p-0 lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile full-screen menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] animate-fade-in lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="safe-top safe-bottom absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col bg-[var(--lh-card)] p-6 shadow-lifted">
            <div className="flex items-center justify-between">
              <Logo />
              <button className="btn-ghost h-10 w-10 rounded-full !p-0" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-8 flex flex-col gap-1" aria-label="Mobile">
              {NAV.map((item, i) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="animate-fade-up rounded-2xl px-4 py-3.5 font-display text-xl font-medium hover:bg-navy-900/5 dark:hover:bg-white/5"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto space-y-3">
              {user ? (
                <Link href="/dashboard" className="btn-primary btn-lg w-full">
                  Go to dashboard
                </Link>
              ) : (
                <>
                  <Link href="/auth/register" className="btn-gold btn-lg w-full">
                    Start learning free
                  </Link>
                  <Link href="/auth/login" className="btn-ghost btn-lg w-full">
                    Log in
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Command-palette style search                                        */
/* ------------------------------------------------------------------ */

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const [catalog, setCatalog] = useState<Course[]>([]);
  useEffect(() => {
    void fetchMergedCourses().then(setCatalog);
  }, []);

  const q = query.trim().toLowerCase();
  const results = q
    ? catalog.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
      ).slice(0, 6)
    : catalog.filter((c) => c.featured).slice(0, 4);

  return (
    <div className="fixed inset-0 z-[70] animate-fade-in" role="dialog" aria-modal="true" aria-label="Search">
      <div className="absolute inset-0 bg-navy-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-4 top-[10vh] mx-auto max-w-xl animate-scale-in">
        <div className="overflow-hidden rounded-3xl border bg-[var(--lh-card)] shadow-lifted">
          <div className="flex items-center gap-3 border-b px-5 py-4">
            <Search className="h-5 w-5 text-ocean-600" aria-hidden />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search courses, subjects, teachers…"
              className="w-full bg-transparent text-base outline-none placeholder:text-[var(--lh-ink-soft)]"
              aria-label="Search courses"
            />
            <button onClick={onClose} className="rounded-lg border px-2 py-1 text-2xs font-bold muted">
              ESC
            </button>
          </div>
          <div className="max-h-[50vh] overflow-y-auto p-2">
            <p className="px-3 pb-1 pt-2 text-2xs font-bold uppercase tracking-widest muted">
              {q ? `Results for “${query}”` : "Popular right now"}
            </p>
            {results.length === 0 && (
              <p className="px-3 py-6 text-sm muted">No courses match “{query}”. Try “urdu script”, “ghazal”, or “ielts”.</p>
            )}
            {results.map((c) => (
              <button
                key={c.slug}
                onClick={() => {
                  onClose();
                  router.push(courseHref(c));
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-navy-900/5 dark:hover:bg-white/5"
              >
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white", c.gradient)}>
                  <span className="text-xs font-bold">{c.category[0]}</span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{c.title}</span>
                  <span className="block text-xs muted">
                    {c.category} · {c.level}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
