import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";

export function Rating({
  value,
  count,
  className,
  showValue = true,
}: {
  value: number;
  count?: number;
  className?: string;
  showValue?: boolean;
}) {
  const full = Math.floor(value);
  const half = value - full >= 0.4;
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-label={`Rated ${value} out of 5`}>
      <span className="flex text-gold-400" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) =>
          i < full ? (
            <Star key={i} className="h-3.5 w-3.5 fill-current" />
          ) : i === full && half ? (
            <StarHalf key={i} className="h-3.5 w-3.5 fill-current" />
          ) : (
            <Star key={i} className="h-3.5 w-3.5 opacity-30" />
          )
        )}
      </span>
      {showValue && <span className="text-xs font-semibold">{value.toFixed(1)}</span>}
      {count !== undefined && (
        <span className="text-xs muted">({new Intl.NumberFormat("en-IN").format(count)})</span>
      )}
    </span>
  );
}
