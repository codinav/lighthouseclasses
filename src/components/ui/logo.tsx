import { cn } from "@/lib/utils";

/**
 * The Lighthouse Classes mark: a stylised lighthouse with a sweeping beam.
 * Drawn as inline SVG so it stays crisp at every size and inherits theme colors.
 */
export function LighthouseMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn("h-9 w-9", className)} aria-hidden>
      {/* Beam rays */}
      <path d="M27 10 46 3.5v2.8L29.5 12.5Z" fill="#F4B400" opacity="0.9" />
      <path d="M27 13.5 47 13v3l-20 .8Z" fill="#F4B400" opacity="0.55" />
      <path d="M27 17.5 45 24l-1 2.6-17-6.4Z" fill="#F4B400" opacity="0.3" />
      {/* Lantern */}
      <rect x="19" y="8" width="8" height="7" rx="1.6" fill="#F4B400" />
      {/* Roof */}
      <path d="M23 1.5 29 8H17L23 1.5Z" fill="currentColor" />
      {/* Tower */}
      <path d="M18.5 16h9L31 42H15l3.5-26Z" fill="currentColor" />
      {/* Stripes */}
      <path d="M17.8 21.5h10.4l.6 4.4H17.2l.6-4.4Z" fill="#F4B400" opacity="0.95" />
      <path d="M16.6 31h12.8l.6 4.4H16l.6-4.4Z" fill="#F4B400" opacity="0.95" />
      {/* Base / waves */}
      <path
        d="M4 44c3.4 0 3.4-2.2 6.8-2.2S14.2 44 17.6 44s3.4-2.2 6.8-2.2S27.8 44 31.2 44s3.4-2.2 6.8-2.2S41.4 44 44.8 44"
        stroke="#B3383C"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ className, textClassName }: { className?: string; textClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LighthouseMark className="text-navy-900 dark:text-white" />
      <span className={cn("font-display text-lg font-semibold leading-none tracking-tight", textClassName)}>
        Lighthouse
        <span className="block text-2xs font-sans font-bold uppercase tracking-[0.32em] text-ocean-600 dark:text-gold-400">
          Classes
        </span>
      </span>
    </span>
  );
}
