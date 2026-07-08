"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/providers";

/**
 * Client-side route protection. On the Node build this duplicates the
 * middleware guard; on the static (Hostinger) build — where middleware
 * doesn't exist — it is the guard.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--lh-bg)]">
        <Loader2 className="h-8 w-8 animate-spin text-ocean-600" aria-label="Checking your session" />
      </div>
    );
  }

  return <>{children}</>;
}
