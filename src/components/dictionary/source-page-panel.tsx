"use client";

/**
 * "Authentic source" panel — shows the actual scanned page of a printed
 * English→Urdu dictionary where the searched word is defined.
 *
 * Books are public-domain scans on the Internet Archive; the word→page
 * mapping comes from /dict/sources.json (see scripts/build-source-pages.mjs).
 */
import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, ExternalLink, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  loadSources,
  loadWordBoxes,
  lookupSourcePage,
  sourceArchiveUrl,
  sourcePageImageUrl,
  type SourceBook,
  type SourcesFile,
  type WordBox,
} from "./data";

export function SourcePagePanel({
  word,
  glossMatched,
}: {
  word: string;
  /** query verified as English via our own gloss data — allows interpolated pages */
  glossMatched: boolean;
}) {
  const [sources, setSources] = useState<SourcesFile | null>(null);
  const [failed, setFailed] = useState(false);
  const [bookKey, setBookKey] = useState<string>("standard");
  const [leafDelta, setLeafDelta] = useState(0);
  /** user explicitly asked to check the printed books for this word */
  const [forced, setForced] = useState(false);

  useEffect(() => {
    let alive = true;
    loadSources()
      .then((s) => alive && setSources(s))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  // Flipping pages is per-lookup; a new word or book resets to its page
  useEffect(() => setLeafDelta(0), [word, bookKey]);
  useEffect(() => setForced(false), [word]);

  const books = sources?.books ?? [];
  const withHits = useMemo(
    () =>
      books
        .map((b) => ({ book: b, hit: lookupSourcePage(b, word) }))
        .filter((x): x is { book: SourceBook; hit: NonNullable<ReturnType<typeof lookupSourcePage>> } => x.hit !== null),
    [books, word]
  );

  const active = withHits.find((x) => x.book.key === bookKey) ?? withHits[0] ?? null;

  // Exact word positions from IA full-text search — for on-page highlights.
  const [boxes, setBoxes] = useState<Map<number, WordBox[]> | null>(null);
  const activeBookKey = active?.book.key;
  useEffect(() => {
    setBoxes(null);
    if (!active) return;
    let alive = true;
    loadWordBoxes(active.book, word).then((m) => alive && setBoxes(m));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBookKey, word]);

  if (failed) return null;

  if (!sources) {
    // Don't flash a skeleton for queries that may turn out not to be English
    return glossMatched ? <div className="skeleton h-[480px] w-full rounded-3xl" aria-hidden /> : null;
  }

  // Show when we know the word is English, or a printed book anchors it exactly
  // (covers headwords the printed dictionaries have but our word list doesn't).
  // Otherwise offer a manual lookup instead of guessing.
  if (withHits.length === 0) return null;
  if (!forced && !glossMatched && !withHits.some((x) => x.hit.exact)) {
    if (word.length < 3) return null;
    return (
      <button onClick={() => setForced(true)} className="card card-hover flex w-full items-center gap-3 p-5 text-left">
        <BookOpen className="h-5 w-5 shrink-0 text-ocean-600 dark:text-gold-400" aria-hidden />
        <span className="min-w-0">
          <span className="block text-sm font-semibold">Check the printed dictionaries for “{word}”</span>
          <span className="block text-xs muted">Opens the scanned page of an authentic 1930s English–Urdu lughat.</span>
        </span>
      </button>
    );
  }

  const { book, hit } = active!;
  // If full-text search found the word on a page adjacent to our alphabetical
  // guess (OCR gaps), snap to it — but never fight an exact anchor.
  let baseLeaf = hit.leaf;
  if (boxes && !hit.exact && !boxes.has(hit.leaf)) {
    let best: number | null = null;
    boxes.forEach((_v, p) => {
      if (Math.abs(p - hit.leaf) <= 3 && (best === null || Math.abs(p - hit.leaf) < Math.abs(best - hit.leaf))) best = p;
    });
    if (best !== null) baseLeaf = best;
  }
  const leaf = Math.min(Math.max(baseLeaf + leafDelta, 0), book.leafCount - 1);
  const printed = hit.printed === null ? null : hit.printed + (leaf - hit.leaf);

  // Instant highlight from the build-time anchor, plus every occurrence from
  // IA full-text search once it responds (it can take ~30s uncached).
  const runtimeBoxes = boxes?.get(leaf) ?? [];
  const pageBoxes = [...runtimeBoxes];
  if (hit.box && leaf === hit.leaf) {
    const a = hit.box;
    const overlaps = runtimeBoxes.some((b) => {
      const bl = (b.l / b.pw) * 1000, br = (b.r / b.pw) * 1000;
      const bt = (b.t / b.ph) * 1000, bb = (b.b / b.ph) * 1000;
      return bl < a.r && br > a.l && bt < a.b && bb > a.t;
    });
    if (!overlaps) pageBoxes.push(a);
  }
  const scanning = boxes === null;

  return (
    <div className="card overflow-hidden">
      <div className="border-b p-5">
        <span className="eyebrow">
          <BookOpen className="h-3.5 w-3.5" aria-hidden /> Authentic source · مستند حوالہ
        </span>

        {withHits.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Printed dictionary">
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
                {b.title.replace("The ", "").replace(" English-Urdu Dictionary", "")} ({b.year})
              </button>
            ))}
          </div>
        )}

        <p className="mt-3 text-sm">
          <span className="font-semibold">“{word}”</span>{" "}
          <span className="muted">
            {hit.exact ? "is defined" : "appears"} on{" "}
            {printed !== null ? `page ${printed}` : `scan ${leaf}`} of
          </span>
        </p>
        <p className="text-sm font-semibold">{book.title}</p>
        <p className="text-xs muted">
          {book.author} · {book.publisher}, {book.year} · meanings in {book.script}
        </p>
      </div>

      <PageImage book={book} leaf={leaf} printed={printed} boxes={pageBoxes} />

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
            <button
              className="btn-ghost btn-sm !py-1.5 text-xs"
              onClick={() => setLeafDelta(0)}
              aria-label={`Back to the page for ${word}`}
            >
              <RotateCcw className="h-3 w-3" aria-hidden /> “{word}”
            </button>
          )}
        </div>
        <span className="text-xs muted">
          {printed !== null ? `page ${printed}` : `scan ${leaf}`}
          {pageBoxes.length > 0 && (
            <span className="text-gold-600 dark:text-gold-400"> · {pageBoxes.length} highlighted</span>
          )}
          {scanning && <span className="animate-pulse"> · finding “{word}”…</span>}
        </span>
        <a
          href={sourceArchiveUrl(book, leaf)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-ocean-600 hover:underline dark:text-gold-400"
        >
          Archive.org <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      </div>

      <p className="border-t px-5 py-2.5 text-2xs muted">
        Public-domain scan courtesy of the Internet Archive &amp; Digital Library of India.
      </p>
    </div>
  );
}

function PageImage({
  book,
  leaf,
  printed,
  boxes,
}: {
  book: SourceBook;
  leaf: number;
  printed: number | null;
  boxes: WordBox[];
}) {
  const src = sourcePageImageUrl(book, leaf);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => setState("loading"), [src]);

  return (
    <div className="relative min-h-[320px] bg-navy-900/[0.03] dark:bg-white/[0.03]">
      {state === "loading" && <div className="skeleton absolute inset-3 !rounded-2xl" aria-hidden />}
      {state === "error" ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm muted">The page scan couldn’t load right now.</p>
          <a href={sourceArchiveUrl(book, leaf)} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm">
            View it on Archive.org <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      ) : (
        <a
          href={sourceArchiveUrl(book, leaf)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${book.title} on Archive.org`}
          className="relative block"
        >
          <img
            key={src}
            src={src}
            alt={`Scanned ${printed !== null ? `page ${printed}` : `page ${leaf}`} of ${book.title}`}
            referrerPolicy="no-referrer"
            className={cn("w-full transition-opacity duration-300", state === "ready" ? "opacity-100" : "opacity-0")}
            onLoad={() => setState("ready")}
            onError={() => setState("error")}
          />
          {/* Marker-pen highlights over each occurrence of the searched word */}
          {state === "ready" &&
            boxes.map((b, i) => (
              <span
                key={i}
                aria-hidden
                className="pointer-events-none absolute rounded-sm bg-gold-400/60 mix-blend-multiply ring-1 ring-gold-500/50"
                style={{
                  left: `${((b.l - 0.004 * b.pw) / b.pw) * 100}%`,
                  top: `${((b.t - 0.004 * b.ph) / b.ph) * 100}%`,
                  width: `${((b.r - b.l + 0.008 * b.pw) / b.pw) * 100}%`,
                  height: `${((b.b - b.t + 0.008 * b.ph) / b.ph) * 100}%`,
                }}
              />
            ))}
        </a>
      )}
    </div>
  );
}
