"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpDown, Search, SlidersHorizontal, X } from "lucide-react";
import { CATEGORIES } from "@/lib/data";
import { fetchMergedCourses } from "@/lib/courses";
import type { Course } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CourseCard } from "./course-card";

const LEVELS = ["Beginner", "Intermediate", "Advanced", "All Levels"] as const;
const LANGUAGES = ["English", "Hindi", "Urdu", "Persian"] as const;
const PRICE_BANDS = [
  { label: "Under ₹2,000", test: (p: number) => p < 2000 },
  { label: "₹2,000 – ₹3,000", test: (p: number) => p >= 2000 && p <= 3000 },
  { label: "Above ₹3,000", test: (p: number) => p > 3000 },
];
const SORTS = ["Newest", "Price: low to high", "Price: high to low"] as const;

export function CourseExplorer() {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState(params.get("category") ?? "");
  const [level, setLevel] = useState("");
  const [language, setLanguage] = useState("");
  const [priceBand, setPriceBand] = useState(-1);
  const [sort, setSort] = useState<(typeof SORTS)[number]>("Newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [catalog, setCatalog] = useState<Course[]>([]);

  // Merged catalog: admin visibility/pricing applied + admin-created courses
  useEffect(() => {
    let cancelled = false;
    void fetchMergedCourses().then((merged) => {
      if (!cancelled) setCatalog(merged);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Brief skeleton shimmer when filters change — perceived responsiveness
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 280);
    return () => clearTimeout(t);
  }, [query, category, level, language, priceBand, sort]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = catalog.filter((c) => {
      if (q && ![c.title, c.subtitle, c.category, ...c.tags].join(" ").toLowerCase().includes(q)) return false;
      if (category && c.category !== category) return false;
      if (level && c.level !== level) return false;
      if (language && !c.language.includes(language)) return false;
      if (priceBand >= 0 && !PRICE_BANDS[priceBand].test(c.price)) return false;
      return true;
    });
    switch (sort) {
      case "Price: low to high":
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "Price: high to low":
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      default: // Newest
        list = [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    return list;
  }, [query, category, level, language, priceBand, sort, catalog]);

  const activeFilters = [category, level, language, priceBand >= 0 ? PRICE_BANDS[priceBand].label : ""].filter(Boolean).length;

  const clearAll = () => {
    setCategory("");
    setLevel("");
    setLanguage("");
    setPriceBand(-1);
    setQuery("");
  };

  return (
    <div className="mt-8">
      {/* Search + sort bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 muted" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses, tags, subjects…"
            className="input-lh !rounded-full !py-3.5 pl-11"
            aria-label="Search courses"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 muted" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className={cn("btn-ghost btn-md flex-1 sm:flex-none", activeFilters > 0 && "!border-ocean-500 text-ocean-600 dark:text-gold-400")}
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Filters {activeFilters > 0 && `(${activeFilters})`}
          </button>
          <label className="relative flex-1 sm:flex-none">
            <span className="sr-only">Sort courses</span>
            <ArrowUpDown className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 muted" aria-hidden />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as (typeof SORTS)[number])}
              className="input-lh w-full appearance-none !rounded-full !py-3.5 pl-11 pr-8 sm:w-52"
            >
              {SORTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Category chips */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setCategory("")}
          className={cn("chip shrink-0", !category ? "border-navy-900 bg-navy-900 text-white dark:border-gold-400 dark:bg-gold-400 dark:text-navy-950" : "hover:border-ocean-500")}
        >
          All subjects
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.name}
            onClick={() => setCategory(category === c.name ? "" : c.name)}
            className={cn(
              "chip shrink-0",
              category === c.name
                ? "border-navy-900 bg-navy-900 text-white dark:border-gold-400 dark:bg-gold-400 dark:text-navy-950"
                : "hover:border-ocean-500"
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Expanded filters */}
      {filtersOpen && (
        <div className="card mt-4 grid animate-scale-in gap-6 p-5 sm:grid-cols-3 sm:p-6">
          <FilterGroup label="Level" options={[...LEVELS]} value={level} onChange={setLevel} />
          <FilterGroup label="Language" options={[...LANGUAGES]} value={language} onChange={setLanguage} />
          <div>
            <p className="text-2xs font-bold uppercase tracking-widest muted">Price</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PRICE_BANDS.map((band, i) => (
                <button
                  key={band.label}
                  onClick={() => setPriceBand(priceBand === i ? -1 : i)}
                  className={cn(
                    "chip",
                    priceBand === i ? "border-ocean-600 bg-ocean-600 text-white" : "hover:border-ocean-500"
                  )}
                >
                  {band.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results meta */}
      <div className="mt-8 flex items-center justify-between">
        <p className="text-sm muted" aria-live="polite">
          {results.length} course{results.length === 1 ? "" : "s"} found
        </p>
        {activeFilters > 0 && (
          <button onClick={clearAll} className="text-sm font-semibold text-ocean-600 hover:underline dark:text-gold-400">
            Clear all filters
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="skeleton aspect-video !rounded-none" />
              <div className="space-y-3 p-5">
                <div className="skeleton h-3 w-24" />
                <div className="skeleton h-5 w-4/5" />
                <div className="skeleton h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((course) => (
            <CourseCard key={course.slug} course={course} />
          ))}
        </div>
      ) : (
        <div className="card mt-6 flex flex-col items-center gap-3 p-14 text-center">
          <Search className="h-10 w-10 muted" aria-hidden />
          <h2 className="font-display text-xl font-semibold">Nothing in this beam of light</h2>
          <p className="max-w-sm text-sm muted">
            No courses match your filters. Try clearing a filter, or search for “urdu”, “ghazal”,
            “english”, or “persian”.
          </p>
          <button onClick={clearAll} className="btn-ocean btn-md mt-2">
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-2xs font-bold uppercase tracking-widest muted">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(value === opt ? "" : opt)}
            className={cn("chip", value === opt ? "border-ocean-600 bg-ocean-600 text-white" : "hover:border-ocean-500")}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
