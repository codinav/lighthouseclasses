"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Award,
  Bell,
  BookOpen,
  ClipboardList,
  Heart,
  LayoutDashboard,
  Loader2,
  Medal,
  Settings,
  Sparkles,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useAuth } from "@/lib/providers";
import { useNotifications } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/my-courses", label: "My Courses", icon: BookOpen },
  { href: "/dashboard/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/dashboard/certificates", label: "Certificates", icon: Award },
  { href: "/dashboard/achievements", label: "Achievements", icon: Medal },
  { href: "/dashboard/wishlist", label: "Wishlist & Bookmarks", icon: Heart },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { unread } = useNotifications();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-ocean-600" aria-label="Loading your dashboard" />
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="container-lh flex gap-8 pb-28 pt-24 lg:pb-16">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 lg:block" aria-label="Dashboard navigation">
          <nav className="sticky top-24 space-y-1">
            {LINKS.map((link) => {
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
                  {link.href === "/dashboard/notifications" && unread > 0 && (
                    <span className="ml-auto rounded-full bg-rose-500 px-1.5 py-0.5 text-2xs font-bold text-white">
                      {unread}
                    </span>
                  )}
                </Link>
              );
            })}

            <div className="!mt-6 rounded-3xl bg-gradient-to-br from-navy-900 to-ocean-800 p-5 text-white">
              <Sparkles className="h-5 w-5 text-gold-400" aria-hidden />
              <p className="mt-2 text-sm font-bold">Go further with Lighthouse</p>
              <p className="mt-1 text-xs text-white/65">Live classes, mentorship & test series.</p>
              <Link href="/pricing" className="btn-gold btn-sm mt-3 w-full">
                Upgrade plan
              </Link>
            </div>
          </nav>
        </aside>

        <main id="main" className="min-w-0 flex-1">{children}</main>
      </div>
      <MobileNav />
    </>
  );
}
