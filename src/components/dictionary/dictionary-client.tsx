"use client";

/**
 * Urdu Dictionary — Rekhta-style lughat.
 *
 * One screen, four states driven by the URL + query:
 *   home (word of the day, browse, popular) → results → word detail → letter browse.
 * Deep links: /dictionary?w=<headword> and /dictionary?l=<letter>.
 */
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  Search,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  hasDevanagari,
  hasUrduScript,
  loadIndex,
  loadWord,
  normalizeEnglish,
  searchIndex,
  stripUrduDiacritics,
  wordOfTheDay,
  type DictEntry,
  type DictIndex,
  type IndexRow,
} from "./data";
import { SourcePagePanel } from "./source-page-panel";
import { UrduSourcePanel } from "./urdu-source-panel";

const POPULAR = [
  "محبت", "عشق", "زندگی", "دل", "خواب", "دوست",
  "شکریہ", "سلام", "کتاب", "علم", "امید", "دنیا",
];

export function DictionaryClient() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selectedWord = params.get("w");
  const selectedLetter = params.get("l");

  const [idx, setIdx] = useState<DictIndex | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    loadIndex()
      .then((i) => alive && setIdx(i))
      .catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
  }, []);

  const openWord = useCallback(
    (w: string) => {
      setQuery("");
      router.push(`${pathname}?w=${encodeURIComponent(w)}`, { scroll: false });
    },
    [router, pathname]
  );
  const openLetter = useCallback(
    (l: string) => {
      setQuery("");
      router.push(`${pathname}?l=${encodeURIComponent(l)}`, { scroll: false });
    },
    [router, pathname]
  );
  const goHome = useCallback(() => {
    setQuery("");
    router.push(pathname, { scroll: false });
  }, [router, pathname]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [selectedWord, selectedLetter]);

  const results = useMemo(
    () => (idx && query.trim() ? searchIndex(idx, query) : []),
    [idx, query]
  );

  /**
   * English-lookup detection for the printed-source panel: the first query
   * token, provided the query is Latin-script. glossMatched tells the panel
   * the word really is English (it appears in a result's meaning), so it can
   * also show pages for words we only know from the printed books.
   */
  const source = useMemo(() => {
    const q = query.trim();
    if (!idx || !q || hasUrduScript(q) || hasDevanagari(q)) return null;
    const w = normalizeEnglish(q.split(/\s+/)[0]);
    if (w.length < 2) return null;
    const re = new RegExp(`(^|[^a-z])${w}([^a-z]|$)`);
    const glossMatched = results.slice(0, 15).some((i) => re.test(idx.keys[i].g));
    return { word: w, glossMatched };
  }, [idx, query, results]);

  const view: "home" | "results" | "word" | "letter" = query.trim()
    ? "results"
    : selectedWord
      ? "word"
      : selectedLetter
        ? "letter"
        : "home";

  return (
    <div className="bg-hero-radial">
      {/* ------------------------------ Hero ------------------------------ */}
      <section className="container-lh pt-10 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow animate-fade-up">
            <BookOpen className="h-3.5 w-3.5" aria-hidden /> Urdu Lughat · اُردُو لُغَت
          </span>
          <h1 className="section-title mt-5 animate-fade-up" style={{ animationDelay: "60ms" }}>
            Urdu Dictionary
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm muted sm:text-base animate-fade-up" style={{ animationDelay: "120ms" }}>
            {idx
              ? `Meanings of ${idx.count.toLocaleString()} Urdu words — search in Urdu, Hindi, Roman, or English.`
              : "Meanings of thousands of Urdu words — search in Urdu, Hindi, Roman, or English."}
          </p>

          {/* Search bar */}
          <div className="relative mt-7 animate-fade-up" style={{ animationDelay: "180ms" }}>
            <div className="card flex items-center gap-3 rounded-full px-5 py-1.5 shadow-lifted">
              <Search className="h-5 w-5 shrink-0 text-ocean-600" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && results.length && idx) openWord(idx.words[results[0]][0]);
                  if (e.key === "Escape") setQuery("");
                }}
                placeholder="Search — محبت, mohabbat, or love…"
                className="w-full bg-transparent py-3 text-base outline-none placeholder:text-[var(--lh-ink-soft)]"
                aria-label="Search the Urdu dictionary"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="search"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="btn-ghost h-8 w-8 shrink-0 rounded-full !p-0"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="mt-3 text-xs muted">
              Works across scripts — try{" "}
              <button className="font-semibold text-ocean-600 hover:underline dark:text-gold-400" onClick={() => setQuery("خواب")}>
                خواب
              </button>
              ,{" "}
              <button className="font-semibold text-ocean-600 hover:underline dark:text-gold-400" onClick={() => setQuery("zindagi")}>
                zindagi
              </button>{" "}
              or{" "}
              <button className="font-semibold text-ocean-600 hover:underline dark:text-gold-400" onClick={() => setQuery("love")}>
                love
              </button>
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------ Body ------------------------------ */}
      <section className="container-lh pb-24 pt-10 sm:pt-12">
        {loadError && (
          <div className="card mx-auto max-w-xl p-8 text-center">
            <p className="font-semibold">The dictionary couldn’t load.</p>
            <p className="mt-1 text-sm muted">Check your connection and try again.</p>
            <button className="btn-primary btn-sm mt-4" onClick={() => location.reload()}>
              Retry
            </button>
          </div>
        )}

        {!idx && !loadError && <HomeSkeleton />}

        {idx && view === "results" && (
          <ResultsView idx={idx} query={query} results={results} onOpen={openWord} source={source} />
        )}
        {idx && view === "word" && selectedWord && (
          <WordView idx={idx} word={selectedWord} onOpen={openWord} onBack={goHome} />
        )}
        {idx && view === "letter" && selectedLetter && (
          <LetterView idx={idx} letter={selectedLetter} onOpen={openWord} onOpenLetter={openLetter} onBack={goHome} />
        )}
        {idx && view === "home" && (
          <HomeView idx={idx} onOpen={openWord} onOpenLetter={openLetter} onSearch={setQuery} />
        )}

        {/* Attribution — data licence requires it */}
        <p className="mt-16 text-center text-xs muted">
          Dictionary data from{" "}
          <a
            href="https://kaikki.org/dictionary/Urdu/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-ocean-600"
          >
            Wiktionary via kaikki.org
          </a>{" "}
          · CC BY-SA 4.0 {idx ? `· ${idx.count.toLocaleString()} words, ${idx.senses.toLocaleString()} meanings` : ""}
        </p>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

/** Urdu text set in Nastaliq — needs generous line-height to avoid clipping. */
function Urdu({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span dir="rtl" lang="ur" className={cn("font-urdu", className)}>
      {children}
    </span>
  );
}

function ResultRow({ row, onOpen }: { row: IndexRow; onOpen: (w: string) => void }) {
  const [word, roman, hindi, pos, brief] = row;
  return (
    <button
      onClick={() => onOpen(word)}
      className="card card-hover flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
    >
      <span className="min-w-0">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-bold">{roman || word}</span>
          {hindi && <span className="text-sm muted">{hindi}</span>}
          <span className="text-2xs font-bold uppercase tracking-wider text-ocean-600 dark:text-gold-400">{pos}</span>
        </span>
        <span className="mt-0.5 block truncate text-sm muted">{brief}</span>
      </span>
      <Urdu className="shrink-0 pb-1 text-2xl leading-[1.9] text-[var(--lh-ink)]">{word}</Urdu>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

function ResultsView({
  idx,
  query,
  results,
  onOpen,
  source,
}: {
  idx: DictIndex;
  query: string;
  results: number[];
  onOpen: (w: string) => void;
  source: { word: string; glossMatched: boolean } | null;
}) {
  return (
    <div
      className={cn(
        "mx-auto",
        source ? "max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-6" : "max-w-3xl"
      )}
    >
      <div className="min-w-0">
        <p className="px-1 pb-3 text-2xs font-bold uppercase tracking-widest muted">
          {results.length
            ? `${results.length === 60 ? "60+" : results.length} match${results.length === 1 ? "" : "es"} for “${query.trim()}”`
            : `No matches for “${query.trim()}”`}
        </p>
        {results.length === 0 && (
          <div className="card p-8 text-center">
            <p className="font-semibold">Nothing found in our word list.</p>
            <p className="mx-auto mt-2 max-w-md text-sm muted">
              Try the Urdu spelling (محبت), the Roman spelling (mohabbat), or an English word (love).
              {source ? " If it’s an English word, the printed dictionary below may still have it." : ""}
            </p>
          </div>
        )}
        <div className="space-y-2.5">
          {results.map((i) => (
            <ResultRow key={idx.words[i][0]} row={idx.words[i]} onOpen={onOpen} />
          ))}
        </div>
      </div>

      {source && (
        <div className="mt-6 lg:sticky lg:top-24 lg:mt-0">
          <SourcePagePanel word={source.word} glossMatched={source.glossMatched} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Word detail                                                         */
/* ------------------------------------------------------------------ */

function WordView({
  idx,
  word,
  onOpen,
  onBack,
}: {
  idx: DictIndex;
  word: string;
  onOpen: (w: string) => void;
  onBack: () => void;
}) {
  const [entries, setEntries] = useState<DictEntry[] | null | "missing">(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let alive = true;
    setEntries(null);
    loadWord(idx, word)
      .then((e) => alive && setEntries(e ?? "missing"))
      .catch(() => alive && setEntries("missing"));
    return () => {
      alive = false;
      audioRef.current?.pause();
    };
  }, [idx, word]);

  const at = idx.byWord.get(word);
  const nearby = useMemo(() => {
    if (at === undefined) return [];
    const from = Math.max(0, at - 4);
    return idx.words.slice(from, Math.min(idx.words.length, at + 5));
  }, [idx, at]);

  if (entries === "missing") {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <p className="font-semibold">
          “<Urdu className="text-xl">{word}</Urdu>” isn’t in the dictionary yet.
        </p>
        <button className="btn-primary btn-sm mt-4" onClick={onBack}>
          Back to dictionary
        </button>
      </div>
    );
  }

  if (!entries) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="skeleton h-40 w-full rounded-3xl" />
        <div className="skeleton h-64 w-full rounded-3xl" />
      </div>
    );
  }

  const head = entries[0];
  const headRoman = entries.map((e) => e.r).find(Boolean);
  const headHindi = entries.map((e) => e.h).find(Boolean);
  const headIpa = entries.map((e) => e.ipa).find(Boolean);
  const audioUrl = entries.map((e) => e.a).find(Boolean);
  const play = () => {
    if (!audioUrl) return;
    audioRef.current?.pause();
    audioRef.current = new Audio(audioUrl);
    void audioRef.current.play();
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_280px]">
      <div className="min-w-0">
        <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ocean-600 hover:underline dark:text-gold-400">
          <ArrowLeft className="h-4 w-4" aria-hidden /> All words
        </button>

        {/* Headword card */}
        <div className="card animate-fade-up p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <Urdu className="block pb-2 text-5xl font-bold leading-[2] sm:text-6xl">
                {head.c ?? word}
              </Urdu>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                {headRoman && <span className="text-lg font-bold">{headRoman}</span>}
                {headHindi && <span className="text-lg muted">{headHindi}</span>}
                {headIpa && <span className="font-mono text-sm muted">{headIpa}</span>}
              </div>
            </div>
            {audioUrl && (
              <button onClick={play} className="btn-ghost btn-sm shrink-0" aria-label={`Play pronunciation of ${headRoman ?? word}`}>
                <Volume2 className="h-4 w-4 text-ocean-600" aria-hidden /> Listen
              </button>
            )}
          </div>
        </div>

        {/* One block per part of speech */}
        {entries.map((entry, ei) => (
          <div key={ei} className="card mt-4 animate-fade-up p-6 sm:p-8" style={{ animationDelay: `${(ei + 1) * 80}ms` }}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="eyebrow !tracking-[0.14em]">{entry.pos}</span>
              {entry.r && entry.r !== headRoman && (
                <span className="text-sm muted">
                  <Urdu className="text-base">{entry.c ?? word}</Urdu> · {entry.r}
                  {entry.ipa ? ` · ${entry.ipa}` : ""}
                </span>
              )}
            </div>

            <ol className="mt-5 space-y-5">
              {entry.senses.map((s, si) => (
                <li key={si} className="flex gap-4">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-900/5 text-xs font-bold muted dark:bg-white/10">
                    {si + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-medium leading-relaxed">{s.g}</p>
                    {s.t && (
                      <p className="mt-1.5 flex flex-wrap gap-1.5">
                        {s.t.map((t) => (
                          <span key={t} className="chip border-gold-400/40 bg-gold-400/10 text-gold-700 dark:text-gold-300">
                            {t}
                          </span>
                        ))}
                      </p>
                    )}
                    {s.ex && (
                      <div className="mt-3 rounded-2xl border border-gold-400/30 bg-gold-400/[0.06] px-4 py-3">
                        <Urdu className="block pb-1 text-xl leading-[2.1]">{s.ex.u}</Urdu>
                        {s.ex.r && <p className="text-sm italic muted">{s.ex.r}</p>}
                        {s.ex.e && <p className="mt-0.5 text-sm">— {s.ex.e}</p>}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            {entry.e && (
              <div className="mt-6 rounded-2xl bg-navy-900/[0.04] px-4 py-3 dark:bg-white/[0.05]">
                <p className="text-2xs font-bold uppercase tracking-widest muted">Origin</p>
                <p className="mt-1 text-sm leading-relaxed">{entry.e}</p>
              </div>
            )}

            {entry.syn && (
              <div className="mt-5">
                <p className="text-2xs font-bold uppercase tracking-widest muted">Synonyms</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {entry.syn.map((syn) => {
                    const target = idx.byWord.has(syn)
                      ? syn
                      : idx.byWord.has(stripUrduDiacritics(syn))
                        ? stripUrduDiacritics(syn)
                        : null;
                    return target ? (
                      <button
                        key={syn}
                        onClick={() => onOpen(target)}
                        className="chip border-ocean-600/25 pb-2 text-ocean-700 hover:bg-ocean-600/10 dark:border-gold-400/30 dark:text-gold-300 dark:hover:bg-gold-400/10"
                      >
                        <Urdu className="text-lg leading-[1.7]">{syn}</Urdu>
                      </button>
                    ) : (
                      <span key={syn} className="chip pb-2 muted">
                        <Urdu className="text-lg leading-[1.7]">{syn}</Urdu>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* The word in the great classical Urdu lughats (scanned pages) */}
        {at !== undefined && (
          <div className="mt-6 animate-fade-up">
            <UrduSourcePanel word={word} rank={at} />
          </div>
        )}
      </div>

      {/* Nearby words — like the column of a printed lughat */}
      <aside className="lg:pt-11">
        <div className="card p-5">
          <p className="text-2xs font-bold uppercase tracking-widest muted">Nearby words</p>
          <ul className="mt-3 space-y-0.5">
            {nearby.map((row) => {
              const active = row[0] === word;
              return (
                <li key={row[0]}>
                  <button
                    onClick={() => !active && onOpen(row[0])}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left",
                      active
                        ? "bg-gold-400/15 font-bold"
                        : "hover:bg-navy-900/5 dark:hover:bg-white/5"
                    )}
                    aria-current={active ? "true" : undefined}
                  >
                    <span className="truncate text-xs muted">{row[1] || row[4]}</span>
                    <Urdu className="shrink-0 pb-1 text-lg leading-[1.8]">{row[0]}</Urdu>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Letter browse                                                       */
/* ------------------------------------------------------------------ */

const LETTER_PAGE = 96;

function LetterView({
  idx,
  letter,
  onOpen,
  onOpenLetter,
  onBack,
}: {
  idx: DictIndex;
  letter: string;
  onOpen: (w: string) => void;
  onOpenLetter: (l: string) => void;
  onBack: () => void;
}) {
  const [shown, setShown] = useState(LETTER_PAGE);
  useEffect(() => setShown(LETTER_PAGE), [letter]);

  const matches = useMemo(() => {
    const out: IndexRow[] = [];
    for (let i = 0; i < idx.words.length; i++) {
      if (idx.keys[i].u.startsWith(letter)) out.push(idx.words[i]);
    }
    return out;
  }, [idx, letter]);

  return (
    <div className="mx-auto max-w-4xl">
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ocean-600 hover:underline dark:text-gold-400">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All words
      </button>

      <AlphabetStrip idx={idx} active={letter} onOpenLetter={onOpenLetter} />

      <p className="mt-6 px-1 pb-3 text-2xs font-bold uppercase tracking-widest muted">
        {matches.length.toLocaleString()} words starting with “{letter}”
      </p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {matches.slice(0, shown).map((row) => (
          <ResultRow key={row[0]} row={row} onOpen={onOpen} />
        ))}
      </div>
      {shown < matches.length && (
        <div className="mt-6 text-center">
          <button className="btn-ghost btn-md" onClick={() => setShown((n) => n + LETTER_PAGE)}>
            <ChevronDown className="h-4 w-4" aria-hidden /> Show more ({(matches.length - shown).toLocaleString()} left)
          </button>
        </div>
      )}
    </div>
  );
}

function AlphabetStrip({
  idx,
  active,
  onOpenLetter,
}: {
  idx: DictIndex;
  active?: string;
  onOpenLetter: (l: string) => void;
}) {
  return (
    <div dir="rtl" className="flex flex-wrap justify-center gap-1.5">
      {idx.letters.map((l) => (
        <button
          key={l}
          onClick={() => onOpenLetter(l)}
          aria-label={`Browse words starting with ${l}`}
          className={cn(
            "font-urdu flex h-11 w-11 items-center justify-center rounded-full border pb-2 text-xl transition-colors",
            l === active
              ? "border-transparent bg-navy-900 text-gold-300 dark:bg-gold-400 dark:text-navy-950"
              : "hover:border-gold-400/60 hover:bg-gold-400/10"
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Home                                                                */
/* ------------------------------------------------------------------ */

function HomeView({
  idx,
  onOpen,
  onOpenLetter,
  onSearch,
}: {
  idx: DictIndex;
  onOpen: (w: string) => void;
  onOpenLetter: (l: string) => void;
  onSearch: (q: string) => void;
}) {
  const wotd = useMemo(() => idx.words[wordOfTheDay(idx)], [idx]);
  const popular = useMemo(
    () => POPULAR.filter((w) => idx.byWord.has(w)),
    [idx]
  );

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      {/* Word of the day */}
      <button
        onClick={() => onOpen(wotd[0])}
        className="card card-hover block w-full overflow-hidden p-0 text-left"
      >
        <div className="grid sm:grid-cols-[1fr_auto]">
          <div className="p-6 sm:p-8">
            <span className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> Word of the day · آج کا لفظ
            </span>
            <p className="mt-4 flex flex-wrap items-baseline gap-x-3">
              <span className="font-display text-2xl font-semibold">{wotd[1] || wotd[0]}</span>
              {wotd[2] && <span className="text-lg muted">{wotd[2]}</span>}
              <span className="text-2xs font-bold uppercase tracking-wider text-ocean-600 dark:text-gold-400">{wotd[3]}</span>
            </p>
            <p className="mt-1.5 text-base muted">{wotd[4]}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ocean-600 dark:text-gold-400">
              Full entry <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
          </div>
          <div className="flex items-center justify-center bg-gold-400/10 px-8 py-6 sm:min-w-[220px]">
            <Urdu className="pb-3 text-5xl font-bold leading-[2]">{wotd[0]}</Urdu>
          </div>
        </div>
      </button>

      {/* Browse by letter */}
      <div>
        <h2 className="pb-4 text-center font-display text-xl font-semibold">
          Browse by letter · حرف سے تلاش
        </h2>
        <AlphabetStrip idx={idx} onOpenLetter={onOpenLetter} />
      </div>

      {/* Popular words */}
      {popular.length > 0 && (
        <div>
          <h2 className="pb-4 text-center font-display text-xl font-semibold">Popular words</h2>
          <div dir="rtl" className="flex flex-wrap justify-center gap-2">
            {popular.map((w) => (
              <button
                key={w}
                onClick={() => onOpen(w)}
                className="chip border-ocean-600/20 pb-2.5 hover:border-gold-400/60 hover:bg-gold-400/10"
              >
                <Urdu className="text-xl leading-[1.8]">{w}</Urdu>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* How to search */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { title: "اردو میں", body: "Type in Urdu script — diacritics optional. کتاب finds کِتاب." },
          { title: "Roman mein", body: "Type how it sounds — mohabbat, zindagi, khwāb all work." },
          { title: "In English", body: "Look up by meaning — search “love” to find محبت and عشق." },
        ].map((c) => (
          <div key={c.title} className="card p-5">
            <p className="font-display text-lg font-semibold">{c.title}</p>
            <p className="mt-1 text-sm muted">{c.body}</p>
          </div>
        ))}
      </div>

      {/* Cross-sell — this is a learning platform, after all */}
      <div className="card flex flex-col items-center gap-4 bg-navy-900 p-8 text-center text-white dark:bg-navy-900 sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="font-display text-xl font-semibold">Want to read Urdu, not just look it up?</p>
          <p className="mt-1 text-sm text-white/70">
            Learn the Nastaliq script from scratch with our structured courses.
          </p>
        </div>
        <Link href="/courses" className="btn-gold btn-md shrink-0">
          Explore courses
        </Link>
      </div>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div className="skeleton h-48 w-full rounded-3xl" />
      <div className="skeleton mx-auto h-32 w-full max-w-2xl rounded-3xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="skeleton h-28 rounded-3xl" />
        <div className="skeleton h-28 rounded-3xl" />
        <div className="skeleton h-28 rounded-3xl" />
      </div>
    </div>
  );
}
