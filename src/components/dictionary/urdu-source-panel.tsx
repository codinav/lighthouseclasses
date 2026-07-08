"use client";

/**
 * Classical lughat panel — shows the scanned page of Farhang-e-Asafia where an
 * Urdu headword is defined. The page comes from an exact word→page map read
 * directly off the scans (build-farhang-anchors.mjs), falling back to abjad
 * interpolation for words that weren't sampled. Flip controls nudge by a page.
 */
import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  interpolateUrduPage,
  loadSources,
  sourcePageImageUrl,
  type UrduSourceBook,
} from "./data";

export function UrduSourcePanel({ word, rank }: { word: string; rank: number }) {
  const [books, setBooks] = useState<UrduSourceBook[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [bookKey, setBookKey] = useState<string>("");
  const [leafDelta, setLeafDelta] = useState(0);

  useEffect(() => {
    let alive = true;
    loadSources()
      .then((s) => alive && setBooks(s.urduBooks ?? []))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const withHits = useMemo(
    () =>
      (books ?? [])
        .map((book) => ({ book, est: interpolateUrduPage(book, rank, word) }))
        .filter((x): x is { book: UrduSourceBook; est: NonNullable<ReturnType<typeof interpolateUrduPage>> } => x.est !== null),
    [books, rank, word]
  );

  const active = withHits.find((x) => x.book.key === bookKey) ?? withHits[0] ?? null;
  const activeKey = active?.book.key;

  useEffect(() => setLeafDelta(0), [word, activeKey]);

  if (failed || (books && withHits.length === 0)) return null;
  if (!books || !active) return <div className="skeleton h-[460px] w-full rounded-3xl" aria-hidden />;

  const { book, est } = active;
  const leaf = Math.min(Math.max(est.leaf + leafDelta, 0), book.leafCount - 1);
  const onEntry = est.exact && leafDelta === 0;

  return (
    <div className="card overflow-hidden">
      <div className="border-b p-5">
        <span className="eyebrow">
          <BookOpen className="h-3.5 w-3.5" aria-hidden /> Classical lughat · کلاسیکی لغات
        </span>

        {withHits.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Printed lughat">
            {withHits.map(({ book: b }) => (
              <button
                key={b.key}
                role="tab"
                aria-selected={b.key === book.key}
                onClick={() => setBookKey(b.key)}
                className={cn(
                  "chip",
                  b.key === book.key
                    ? "border-transparent bg-navy-900 text-white dark:bg-gold-400 dark:text-navy-950"
                    : "hover:bg-navy-900/5 dark:hover:bg-white/5"
                )}
              >
                {b.title}
              </button>
            ))}
          </div>
        )}

        <p className="mt-3 text-sm">
          <span dir="rtl" lang="ur" className="font-urdu text-lg">{word}</span>{" "}
          <span className="muted">
            {onEntry ? "on page" : "around page"} {leaf} of
          </span>
        </p>
        <p className="text-sm font-semibold">
          {book.title} <span dir="rtl" lang="ur" className="font-urdu">· {book.titleUr}</span>
        </p>
        <p className="text-xs muted">
          {book.author} · {book.year} · Urdu-to-Urdu
        </p>
      </div>

      <UrduPageImage book={book} leaf={leaf} word={word} />

      <div className="flex items-center justify-between gap-2 border-t p-3">
        <div className="flex items-center gap-1">
          <button
            className="btn-ghost h-9 w-9 rounded-full !p-0"
            onClick={() => setLeafDelta((d) => d - 1)}
            disabled={leaf <= 0}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            className="btn-ghost h-9 w-9 rounded-full !p-0"
            onClick={() => setLeafDelta((d) => d + 1)}
            disabled={leaf >= book.leafCount - 1}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {leafDelta !== 0 && (
            <button className="btn-ghost btn-sm !py-1.5 text-xs" onClick={() => setLeafDelta(0)}>
              <RotateCcw className="h-3 w-3" aria-hidden /> Reset
            </button>
          )}
        </div>
        <span className="text-xs muted">page {leaf}</span>
      </div>

      <p className="border-t px-5 py-2.5 text-2xs muted">
        {onEntry
          ? "The headword sits at the top of this page."
          : "Page located by alphabetical position — flip a page or two to pinpoint the entry."}
      </p>
    </div>
  );
}

function UrduPageImage({ book, leaf, word }: { book: UrduSourceBook; leaf: number; word: string }) {
  const src = sourcePageImageUrl(book, leaf);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => setState("loading"), [src]);

  return (
    <div className="relative min-h-[320px] overflow-hidden bg-navy-900/[0.03] dark:bg-white/[0.03]">
      {state === "loading" && <div className="skeleton absolute inset-3 !rounded-2xl" aria-hidden />}
      {state === "error" ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm muted">This page couldn’t load right now — please try again.</p>
        </div>
      ) : (
        <img
          key={src}
          src={src}
          alt={`Page ${leaf} of ${book.title} — meaning of ${word}`}
          referrerPolicy="no-referrer"
          /* negative bottom margin + overflow-hidden trims the footer strip off the scan */
          style={{ marginBottom: "-6%" }}
          className={cn("block w-full transition-opacity duration-300", state === "ready" ? "opacity-100" : "opacity-0")}
          onLoad={() => setState("ready")}
          onError={() => setState("error")}
        />
      )}
    </div>
  );
}
