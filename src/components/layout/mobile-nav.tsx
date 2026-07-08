"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Home, LayoutDashboard, Radio, User } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/courses", label: "Explore", icon: Compass },
  { href: "/live", label: "Live", icon: Radio },
  { href: "/dashboard", label: "Learning", icon: LayoutDashboard },
  { href: "/dashboard/settings", label: "Profile", icon: User },
];

/** App-style floating bottom tab bar — mobile only. */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-3 bottom-3 z-50 safe-bottom lg:hidden"
      aria-label="App navigation"
    >
      <div className="glass mx-auto flex max-w-md items-center justify-between rounded-3xl px-2 py-1.5 shadow-lifted">
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : tab.href === "/dashboard"
              ? pathname.startsWith("/dashboard") && !pathname.startsWith("/dashboard/settings")
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={cn(
                "flex min-w-[3.5rem] flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 transition-all",
                active ? "text-ocean-600 dark:text-gold-400" : "muted"
              )}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                  active && "bg-ocean-600/10 dark:bg-gold-400/15"
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.4 : 2} />
              </span>
              <span className="text-2xs font-semibold">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
