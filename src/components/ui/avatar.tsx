"use client";

import { useState } from "react";
import { cn, initials } from "@/lib/utils";

const PALETTES = [
  "from-ocean-500 to-navy-700",
  "from-rose-500 to-pink-700",
  "from-emerald-500 to-teal-700",
  "from-violet-500 to-indigo-700",
  "from-amber-500 to-orange-700",
  "from-cyan-500 to-sky-700",
];

/**
 * Initials avatar with deterministic gradient; renders the photo instead
 * when `src` is provided (e.g. a Google profile picture), falling back to
 * initials if the image fails to load.
 */
export function Avatar({
  name,
  src,
  gradient,
  className,
}: {
  name: string;
  src?: string;
  gradient?: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const palette =
    gradient ?? PALETTES[Math.abs(name.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % PALETTES.length];

  if (src && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className={cn("inline-block h-10 w-10 shrink-0 rounded-full object-cover shadow-soft", className)}
        aria-hidden
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br font-sans text-sm font-bold text-white shadow-soft",
        palette,
        className
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
