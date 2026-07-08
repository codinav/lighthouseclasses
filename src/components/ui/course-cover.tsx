import { cn } from "@/lib/utils";
import { DynamicIcon } from "./icon";

/**
 * Editorial-style generated cover art for courses. Gradient + concentric
 * "beam" arcs + subject icon. Self-contained: no image requests, no broken
 * thumbnails, perfectly on-brand in both themes.
 */
export function CourseCover({
  gradient,
  icon,
  title,
  thumbnail,
  className,
  iconClassName,
}: {
  gradient: string;
  icon: string;
  title?: string;
  /** uploaded cover image — shown instead of the generated art when present */
  thumbnail?: string;
  className?: string;
  iconClassName?: string;
}) {
  if (thumbnail) {
    return (
      <div className={cn("relative overflow-hidden bg-navy-900/[0.06] dark:bg-white/[0.06]", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnail}
          alt={title ? `${title} — course cover` : ""}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
  return (
    <div
      className={cn("relative overflow-hidden bg-gradient-to-br", gradient, className)}
      role={title ? "img" : undefined}
      aria-label={title ? `${title} — course cover` : undefined}
    >
      {/* Beam arcs */}
      <svg className="absolute inset-0 h-full w-full opacity-25" viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <circle cx="330" cy="40" r="70" stroke="white" strokeWidth="1.2" fill="none" />
        <circle cx="330" cy="40" r="115" stroke="white" strokeWidth="1" fill="none" opacity="0.7" />
        <circle cx="330" cy="40" r="165" stroke="white" strokeWidth="0.8" fill="none" opacity="0.45" />
        <circle cx="330" cy="40" r="220" stroke="white" strokeWidth="0.6" fill="none" opacity="0.25" />
      </svg>
      {/* Light source */}
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gold-300/50 blur-2xl" />
      <div className="absolute inset-0 flex items-center justify-center">
        <DynamicIcon name={icon} className={cn("h-12 w-12 text-white/90 drop-shadow-lg", iconClassName)} />
      </div>
      {/* Bottom sheen */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-navy-950/50 to-transparent" />
    </div>
  );
}
