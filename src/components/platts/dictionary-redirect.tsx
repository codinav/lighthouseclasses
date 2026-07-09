"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** /dictionary lives on in old links — send visitors to /platts. */
export function DictionaryRedirect() {
  const router = useRouter();
  useEffect(() => router.replace("/platts"), [router]);
  return (
    <div className="container-lh flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-sm muted">The dictionary has moved.</p>
      <Link href="/platts" className="btn-primary btn-sm">
        Open the Platts Dictionary
      </Link>
    </div>
  );
}
