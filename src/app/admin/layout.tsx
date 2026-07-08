"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, CreditCard, GraduationCap, LayoutDashboard, Loader2, MessagesSquare, Radio, ShieldAlert, ShieldCheck, Tag, Users } from "lucide-react";
import { Header } from "@/components/layout/header";
import { canAccessSection, useAuth } from "@/lib/providers";
import { cn } from "@/lib/utils";

const LINKS = [
  { key: "analytics", href: "/admin", label: "Analytics", icon: LayoutDashboard, exact: true },
  { key: "live", href: "/admin/live", label: "Live Classes", icon: Radio },
  { key: "students", href: "/admin/students", label: "Students", icon: Users },
  { key: "courses", href: "/admin/courses", label: "Courses", icon: BookOpen },
  { key: "teachers", href: "/admin/teachers", label: "Teachers", icon: GraduationCap },
  { key: "payments", href: "/admin/payments", label: "Payments", icon: CreditCard },
  { key: "coupons", href: "/admin/coupons", label: "Coupons", icon: Tag },
  { key: "community", href: "/admin/community", label: "Community", icon: MessagesSquare },
];

/** Which section does the current path belong to? */
function sectionForPath(pathname: string): string {
  if (pathname === "/admin") return "analytics";
  if (pathname.startsWith("/admin/team")) return "team";
  const hit = LINKS.find((l) => l.href !== "/admin" && pathname.startsWith(l.href));
  return hit?.key ?? "analytics";
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // Grants load from the DB just after sign-in — give them a moment before
  // showing "access denied" to a freshly promoted admin.
  const [graceOver, setGraceOver] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, router, pathname]);

  useEffect(() => {
    const t = setTimeout(() => setGraceOver(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const isAdmin = user?.role === "admin" || user?.role === "master";
  const currentSection = sectionForPath(pathname);
  const sectionAllowed =
    currentSection === "team" ? user?.role === "master" : canAccessSection(user ?? null, currentSection);
  const visibleLinks = LINKS.filter((l) => canAccessSection(user ?? null, l.key));

  if (loading || !user || (!isAdmin && !graceOver)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-ocean-600" aria-label="Loading" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Header />
        <div className="container-lh flex min-h-[70vh] flex-col items-center justify-center pt-16 text-center">
          <ShieldAlert className="h-14 w-14 text-rose-500" aria-hidden />
          <h1 className="mt-5 font-display text-2xl font-semibold">Admin access required</h1>
          <p className="mt-2 max-w-md text-sm muted">
            Admin access is granted by the master admin. If you should have it, ask them to add{" "}
            <strong className="text-[var(--lh-ink)]">{user.email}</strong> in Admin → Team.
          </p>
          <Link href="/dashboard" className="btn-primary btn-md mt-6">Back to dashboard</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container-lh flex gap-8 pb-16 pt-24">
        <aside className="hidden w-56 shrink-0 lg:block" aria-label="Admin navigation">
          <div className="sticky top-24">
            <p className="px-4 pb-3 text-2xs font-bold uppercase tracking-[0.2em] muted">
              {user.role === "master" ? "Master admin" : "Admin panel"}
            </p>
            <nav className="space-y-1">
              {[...visibleLinks, ...(user.role === "master" ? [{ key: "team", href: "/admin/team", label: "Team", icon: ShieldCheck, exact: false }] : [])].map((link) => {
                const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-navy-900 text-white shadow-soft dark:bg-gold-400 dark:text-navy-950"
                        : "muted hover:bg-navy-900/5 hover:text-[var(--lh-ink)] dark:hover:bg-white/5"
                    )}
                  >
                    <link.icon className="h-[18px] w-[18px]" aria-hidden />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Mobile tab strip */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-[var(--lh-card)] lg:hidden">
          <nav className="flex justify-around py-2" aria-label="Admin navigation">
            {visibleLinks.map((link) => {
              const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn("flex flex-col items-center gap-0.5 px-3 py-1 text-2xs font-semibold", active ? "text-ocean-600 dark:text-gold-400" : "muted")}
                >
                  <link.icon className="h-5 w-5" aria-hidden />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <main id="main" className="min-w-0 flex-1 pb-20 lg:pb-0">
          {sectionAllowed ? (
            children
          ) : (
            <div className="card flex flex-col items-center gap-3 p-12 text-center">
              <ShieldAlert className="h-10 w-10 text-rose-500" aria-hidden />
              <h1 className="font-display text-2xl font-semibold">No access to this section</h1>
              <p className="max-w-sm text-sm muted">
                The master admin hasn't granted you access to {currentSection === "team" ? "Team" : `the ${currentSection} section`}.
                Ask them to update your permissions in Admin → Team.
              </p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
