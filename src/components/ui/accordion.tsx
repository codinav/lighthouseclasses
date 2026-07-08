"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Accordion({
  items,
  className,
  defaultOpen = 0,
}: {
  items: { title: React.ReactNode; content: React.ReactNode }[];
  className?: string;
  defaultOpen?: number | null;
}) {
  const [open, setOpen] = useState<number | null>(defaultOpen);
  const baseId = useId();

  return (
    <div className={cn("divide-y overflow-hidden rounded-3xl border bg-[var(--lh-card)] shadow-soft", className)}>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <button
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              aria-controls={`${baseId}-panel-${i}`}
            >
              <span className="text-sm font-semibold sm:text-base">{item.title}</span>
              <ChevronDown
                className={cn("h-5 w-5 shrink-0 text-ocean-600 transition-transform duration-300 dark:text-gold-400", isOpen && "rotate-180")}
                aria-hidden
              />
            </button>
            <div
              id={`${baseId}-panel-${i}`}
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="overflow-hidden">
                <div className="px-5 pb-5 text-sm leading-relaxed muted sm:px-6">{item.content}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
