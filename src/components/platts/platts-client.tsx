"use client";

/**
 * Platts Dictionary — a modern reading of John T. Platts' 1884 "Dictionary of
 * Urdu, Classical Hindi, and English". Search in Urdu, Hindi, Roman, or English;
 * open an entry for its three scripts, etymology, part of speech and definition.
 */
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookMarked,
  Globe2,
  History,
  Layers,
  Link2,
  Puzzle,
  Quote,
  ScrollText,
  Search,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  decodePos,
  FREQ_LABELS,
  loadEntry,
  loadIndex,
  loadShers,
  pageImageUrl,
  search as runSearch,
  type PlattsEntry,
  type PlattsIndex,
  type PlattsRow,
  type ShersFile,
} from "./data";

const POPULAR = ["muḥabbat", "ʿishq", "dil", "zindagī", "ḵẖvāb", "dostī", "āsmān", "dāstān"];

export function PlattsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selected = params.get("e"); // row index

  const [idx, setIdx] = useState<PlattsIndex | null>(null);
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

  const openEntry = useCallback(
    (row: number) => {
      setQuery("");
      router.push(`${pathname}?e=${row}`, { scroll: false });
    },
    [router, pathname]
  );
  const goHome = useCallback(() => {
    setQuery("");
    router.push(pathname, { scroll: false });
  }, [router, pathname]);

  useEffect(() => window.scrollTo({ top: 0 }), [selected]);

  const results = useMemo(() => (idx && query.trim() ? runSearch(idx, query) : []), [idx, query]);
  const view: "home" | "results" | "entry" = query.trim() ? "results" : selected ? "entry" : "home";

  return (
    <div className="bg-hero-radial">
      <section className="container-lh pt-10 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow animate-fade-up">
            <BookMarked className="h-3.5 w-3.5" aria-hidden /> Platts · 1884
          </span>
          <h1 className="section-title mt-5 animate-fade-up" style={{ animationDelay: "60ms" }}>
            Platts Dictionary
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm muted sm:text-base animate-fade-up" style={{ animationDelay: "120ms" }}>
            {idx
              ? `${idx.count.toLocaleString()} entries of Urdu, Classical Hindi & English — with etymology and meaning across three scripts.`
              : "A trilingual dictionary of Urdu, Classical Hindi & English."}
          </p>

          <div className="relative mt-7 animate-fade-up" style={{ animationDelay: "180ms" }}>
            <div className="card flex items-center gap-3 rounded-full px-5 py-1.5 shadow-lifted">
              <Search className="h-5 w-5 shrink-0 text-ocean-600" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && results.length) openEntry(results[0]);
                  if (e.key === "Escape") setQuery("");
                }}
                placeholder="Search — محبت, मोहब्बत, muhabbat, or love…"
                className="w-full bg-transparent py-3 text-base outline-none placeholder:text-[var(--lh-ink-soft)]"
                aria-label="Search the Platts dictionary"
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
              Every script works — try{" "}
              {["عشق", "zindagi", "प्रेम", "beauty"].map((w, i) => (
                <span key={w}>
                  {i > 0 && ", "}
                  <button className="font-semibold text-ocean-600 hover:underline dark:text-gold-400" onClick={() => setQuery(w)}>
                    {w}
                  </button>
                </span>
              ))}
            </p>
          </div>
        </div>
      </section>

      <section className="container-lh pb-24 pt-10 sm:pt-12">
        {loadError && (
          <div className="card mx-auto max-w-xl p-8 text-center">
            <p className="font-semibold">The dictionary couldn’t load.</p>
            <button className="btn-primary btn-sm mt-4" onClick={() => location.reload()}>
              Retry
            </button>
          </div>
        )}
        {!idx && !loadError && <HomeSkeleton />}
        {idx && view === "results" && <Results idx={idx} query={query} results={results} onOpen={openEntry} />}
        {idx && view === "entry" && selected && (
          <EntryView idx={idx} row={+selected} onOpen={openEntry} onBack={goHome} onSearch={setQuery} />
        )}
        {idx && view === "home" && <Home idx={idx} onOpen={openEntry} onSearch={setQuery} />}

        <p className="mt-16 text-center text-xs muted">
          From <span className="font-medium">John T. Platts, A Dictionary of Urdu, Classical Hindi and English</span> (1884, public domain).
          {idx ? ` ${idx.count.toLocaleString()} entries.` : ""} Digitisation: Digital Dictionaries of South Asia, Univ. of Chicago.
        </p>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

function SourceChip({ src }: { src: string }) {
  if (!src) return null;
  return (
    <span className="chip border-ocean-600/25 py-1 text-2xs font-bold uppercase tracking-wider text-ocean-700 dark:border-gold-400/30 dark:text-gold-300">
      {src}
    </span>
  );
}

function ResultRow({ row, onOpen }: { row: PlattsRow; idx?: never; onOpen: () => void }) {
  const [u, r, d, src, brief] = row;
  return (
    <button onClick={onOpen} className="card card-hover flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
      <span className="min-w-0">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-base font-bold">{r || u}</span>
          {d && <span dir="ltr" className="font-deva text-sm muted">{d}</span>}
          {src && <span className="text-2xs font-bold uppercase tracking-wider text-ocean-600 dark:text-gold-400">{src}</span>}
        </span>
        <span className="mt-0.5 block truncate text-sm muted">{brief}</span>
      </span>
      <span dir="rtl" lang="ur" className="shrink-0 pb-1 font-urdu text-2xl leading-[1.9] text-[var(--lh-ink)]">
        {u}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

function Results({
  idx,
  query,
  results,
  onOpen,
}: {
  idx: PlattsIndex;
  query: string;
  results: number[];
  onOpen: (row: number) => void;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="px-1 pb-3 text-2xs font-bold uppercase tracking-widest muted">
        {results.length ? `${results.length === 60 ? "60+" : results.length} for “${query.trim()}”` : `No matches for “${query.trim()}”`}
      </p>
      {results.length === 0 && (
        <div className="card p-8 text-center">
          <p className="font-semibold">Nothing found.</p>
          <p className="mx-auto mt-2 max-w-md text-sm muted">
            Try the Urdu (محبت), Hindi (मोहब्बत), Roman (mohabbat), or English (love) form.
          </p>
        </div>
      )}
      <div className="space-y-2.5">
        {results.map((i) => (
          <ResultRow key={i} row={idx.rows[i]} onOpen={() => onOpen(i)} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Entry detail                                                        */
/* ------------------------------------------------------------------ */

function EntryView({
  idx,
  row,
  onOpen,
  onBack,
  onSearch,
}: {
  idx: PlattsIndex;
  row: number;
  onOpen: (row: number) => void;
  onBack: () => void;
  onSearch: (q: string) => void;
}) {
  const [entry, setEntry] = useState<PlattsEntry | null | "missing">(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    let alive = true;
    setEntry(null);
    loadEntry(idx, row)
      .then((e) => alive && setEntry(e ?? "missing"))
      .catch(() => alive && setEntry("missing"));
    return () => {
      alive = false;
      audioRef.current?.pause();
    };
  }, [idx, row]);

  const nearby = useMemo(() => {
    const from = Math.max(0, row - 4);
    return idx.rows.slice(from, Math.min(idx.rows.length, row + 5)).map((r, i) => ({ r, pos: from + i }));
  }, [idx, row]);

  // Derived words computed live from the index: longer words that begin with
  // this headword (e.g. محبت → محبت نامہ).
  const derivedRows = useMemo(() => {
    if (entry === null || entry === "missing" || !entry.u) return [];
    const out: { pos: number; r: PlattsRow }[] = [];
    for (let i = 0; i < idx.rows.length && out.length < 10; i++) {
      const u = idx.rows[i][0];
      if (u !== entry.u && u.startsWith(entry.u)) out.push({ pos: i, r: idx.rows[i] });
    }
    return out;
  }, [idx, entry]);

  if (entry === "missing")
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <p className="font-semibold">Entry not found.</p>
        <button className="btn-primary btn-sm mt-4" onClick={onBack}>
          Back
        </button>
      </div>
    );
  if (!entry) return <div className="mx-auto max-w-3xl space-y-4"><div className="skeleton h-48 rounded-3xl" /><div className="skeleton h-40 rounded-3xl" /></div>;

  const compounds = (entry.subs ?? []).filter((s) => s[2] === 0);
  const idioms = (entry.subs ?? []).filter((s) => s[2] === 1);
  const mainDef = entry.pos && entry.def.startsWith(entry.pos) ? entry.def.slice(entry.pos.length).replace(/^[,.\s]+/, "") : entry.def;
  const shortGloss = mainDef.split(/[;:]/)[0].trim();
  const play = () => {
    if (!entry.au) return;
    audioRef.current?.pause();
    audioRef.current = new Audio(entry.au);
    void audioRef.current.play();
  };

  // Cross-language rows: Hindi + English always; origin forms from the chain.
  const xl: { lang: string; form: string; cls: string; dir?: "rtl" }[] = [];
  if (entry.d) xl.push({ lang: "Hindi", form: entry.d, cls: "font-deva" });
  if (shortGloss) xl.push({ lang: "English", form: shortGloss, cls: "" });
  for (const [lang, form] of entry.chain ?? []) {
    if (!xl.some((x) => x.lang === lang)) {
      const arabicScript = /[؀-ۿ]/.test(form);
      xl.push({ lang, form, cls: arabicScript ? "font-urdu text-xl" : /[ऀ-ॿ]/.test(form) ? "font-deva" : "italic", dir: arabicScript ? "rtl" : undefined });
    }
  }
  if (entry.src === "Persian" && !xl.some((x) => x.lang === "Persian"))
    xl.push({ lang: "Persian", form: entry.u, cls: "font-urdu text-xl", dir: "rtl" });

  const Section = ({
    icon: Icon,
    title,
    urdu,
    children,
    delay = 0,
  }: {
    icon: React.ElementType;
    title: string;
    urdu?: string;
    children: React.ReactNode;
    delay?: number;
  }) => (
    <div className="card mt-4 animate-fade-up p-6 sm:p-8" style={{ animationDelay: `${delay}ms` }}>
      <p className="flex items-center gap-2 text-2xs font-bold uppercase tracking-widest muted">
        <Icon className="h-3.5 w-3.5 text-ocean-600 dark:text-gold-400" aria-hidden /> {title}
        {urdu && <span dir="rtl" lang="ur" className="font-urdu text-sm normal-case tracking-normal">· {urdu}</span>}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );

  const Chip = ({ text, onClick }: { text: string; onClick?: () => void }) => {
    const urduScript = /[؀-ۿ]/.test(text);
    const inner = urduScript ? (
      <span dir="rtl" lang="ur" className="font-urdu pb-1 text-lg leading-[1.8]">{text}</span>
    ) : (
      <span className="text-sm font-semibold">{text}</span>
    );
    return onClick ? (
      <button onClick={onClick} className="chip border-ocean-600/25 hover:border-gold-400/60 hover:bg-gold-400/10">
        {inner}
      </button>
    ) : (
      <span className="chip">{inner}</span>
    );
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_260px]">
      <div className="min-w-0">
        <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ocean-600 hover:underline dark:text-gold-400">
          <ArrowLeft className="h-4 w-4" aria-hidden /> All entries
        </button>

        {/* ------------------------- Headword ------------------------- */}
        <div className="card animate-fade-up p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <span dir="rtl" lang="ur" className="block pb-6 font-urdu text-5xl font-bold leading-[2.3] sm:text-6xl">
                {entry.u}
              </span>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                {entry.r && <span className="text-lg font-bold">{entry.r}</span>}
                {entry.d && <span dir="ltr" className="font-deva text-lg muted">{entry.d}</span>}
                {entry.ipa && <span className="font-mono text-sm muted">{entry.ipa}</span>}
                {entry.au && (
                  <button onClick={play} className="btn-ghost btn-sm !py-1" aria-label={`Play pronunciation of ${entry.r || entry.u}`}>
                    <Volume2 className="h-4 w-4 text-ocean-600 dark:text-gold-400" aria-hidden /> Listen
                  </button>
                )}
              </div>
              {/* Grammar + register + frequency */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {entry.pos && (
                  <span className="chip border-navy-900/15 text-xs font-semibold dark:border-white/15" title={entry.pos}>
                    {decodePos(entry.pos)}
                  </span>
                )}
                {typeof entry.fq === "number" && (
                  <span className="chip border-gold-400/40 bg-gold-400/10 text-xs font-semibold text-gold-700 dark:text-gold-300">
                    {FREQ_LABELS[entry.fq]}
                  </span>
                )}
                {(entry.reg ?? []).map((t) => (
                  <span key={t} className="chip text-xs muted">{t}</span>
                ))}
              </div>
            </div>
            <SourceChip src={entry.src} />
          </div>
        </div>

        {/* ------------------------- Meaning -------------------------- */}
        <Section icon={BookMarked} title="Meaning" urdu="معنی" delay={60}>
          <p className="whitespace-pre-line text-base leading-relaxed">{mainDef}</p>
          {entry.qv && entry.qv.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-xs muted">See also:</span>
              {entry.qv.map((w) => (
                <Chip key={w} text={w} onClick={() => onSearch(w)} />
              ))}
            </div>
          )}
        </Section>

        {/* --------------------------- Sher ---------------------------- */}
        {typeof entry.sh === "number" && <SherCard id={entry.sh} word={entry.u} />}

        {/* --------------------- Origin & history --------------------- */}
        {(entry.ety || entry.root || entry.chain?.length || entry.wety || entry.att) && (
          <Section icon={History} title="Origin & word history" urdu="اشتقاق" delay={100}>
            <div className="space-y-4">
              {entry.chain && entry.chain.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {entry.chain.map(([lang, form], i) => (
                    <span key={i} className="flex items-center gap-2">
                      <span className="rounded-2xl border border-gold-400/40 bg-gold-400/[0.08] px-3 py-1.5 text-center">
                        <span className="block text-2xs font-bold uppercase tracking-wider muted">{lang}</span>
                        <span
                          dir={/[؀-ۿ]/.test(form) ? "rtl" : "ltr"}
                          className={cn("block", /[؀-ۿ]/.test(form) ? "font-urdu pb-1 text-lg" : /[ऀ-ॿ]/.test(form) ? "font-deva" : "italic")}
                        >
                          {form}
                        </span>
                      </span>
                      <span aria-hidden className="text-lg muted">→</span>
                    </span>
                  ))}
                  <span className="rounded-2xl border border-ocean-600/30 bg-ocean-600/[0.06] px-3 py-1.5 text-center">
                    <span className="block text-2xs font-bold uppercase tracking-wider text-ocean-700 dark:text-gold-300">Urdu</span>
                    <span dir="rtl" lang="ur" className="font-urdu block pb-1 text-lg">{entry.u}</span>
                  </span>
                </div>
              )}
              {entry.root && (
                <p className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-widest muted">Root letters</span>
                  <span dir="rtl" className="font-urdu rounded-xl bg-navy-900/[0.04] px-4 pb-2 pt-1 text-2xl tracking-[0.3em] dark:bg-white/[0.06]">
                    {entry.root}
                  </span>
                </p>
              )}
              {entry.ety && (
                <p className="text-sm leading-relaxed">
                  <span className="font-semibold">Formation (Platts): </span>
                  {entry.ety}
                </p>
              )}
              {entry.wety && <p className="text-sm leading-relaxed muted">{entry.wety}</p>}
              {entry.att && (
                <p className="text-sm">
                  <span className="font-semibold">First recorded:</span> {entry.att}
                </p>
              )}
            </div>
          </Section>
        )}

        {/* ------------------------- Examples ------------------------- */}
        {entry.ex && entry.ex.length > 0 && (
          <Section icon={Quote} title="Usage examples" urdu="مثالیں" delay={140}>
            <div className="space-y-4">
              {entry.ex.map(([u, r, en], i) => (
                <div key={i} className="rounded-2xl border border-gold-400/30 bg-gold-400/[0.06] px-4 py-3">
                  <span dir="rtl" lang="ur" className="font-urdu block pb-1 text-xl leading-[2.1]">{u}</span>
                  {r && <p className="text-sm italic muted">{r}</p>}
                  <p className="mt-0.5 text-sm">— {en}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ------------------- Compounds & idioms --------------------- */}
        {compounds.length > 0 && (
          <Section icon={Puzzle} title="Compounds & collocations" urdu="مرکبات" delay={180}>
            <dl className="space-y-3">
              {compounds.map(([t, d], i) => (
                <div key={i} className="border-b pb-3 last:border-b-0 last:pb-0">
                  <dt className="font-semibold">{t}</dt>
                  <dd className="mt-0.5 text-sm muted">{d}</dd>
                </div>
              ))}
            </dl>
          </Section>
        )}
        {idioms.length > 0 && (
          <Section icon={Quote} title="Idioms & phrases" urdu="محاورے" delay={200}>
            <dl className="space-y-3">
              {idioms.map(([t, d], i) => (
                <div key={i} className="border-b pb-3 last:border-b-0 last:pb-0">
                  <dt className="font-semibold">{t}</dt>
                  <dd className="mt-0.5 text-sm muted">{d}</dd>
                </div>
              ))}
            </dl>
          </Section>
        )}

        {/* ------------------ Synonyms / antonyms --------------------- */}
        {((entry.syn?.length ?? 0) > 0 || (entry.ant?.length ?? 0) > 0) && (
          <Section icon={Link2} title="Synonyms & antonyms" urdu="مترادف و متضاد" delay={220}>
            {(entry.syn?.length ?? 0) > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="w-24 text-xs font-bold uppercase tracking-widest muted">Similar</span>
                {entry.syn!.map((w) => (
                  <Chip key={w} text={w} onClick={() => onSearch(w)} />
                ))}
              </div>
            )}
            {(entry.ant?.length ?? 0) > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="w-24 text-xs font-bold uppercase tracking-widest muted">Opposite</span>
                {entry.ant!.map((w) => (
                  <Chip key={w} text={w} onClick={() => onSearch(w)} />
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ------------------ Derived & related ----------------------- */}
        {(derivedRows.length > 0 || (entry.der?.length ?? 0) > 0 || (entry.rel?.length ?? 0) > 0) && (
          <Section icon={Layers} title="Derived & related words" urdu="مشتقات" delay={240}>
            <div className="flex flex-wrap gap-1.5">
              {derivedRows.map(({ pos, r }) => (
                <Chip key={r[0] + pos} text={r[0]} onClick={() => onOpen(pos)} />
              ))}
              {(entry.der ?? []).map((w) => (
                <Chip key={"d" + w} text={w} onClick={() => onSearch(w)} />
              ))}
              {(entry.rel ?? []).map((w) => (
                <Chip key={"r" + w} text={w} onClick={() => onSearch(w)} />
              ))}
            </div>
          </Section>
        )}

        {/* ------------------ Cross-language -------------------------- */}
        {xl.length > 1 && (
          <Section icon={Globe2} title="Across languages" urdu="دیگر زبانیں" delay={260}>
            <div className="grid gap-2 sm:grid-cols-2">
              {xl.map((x) => (
                <div key={x.lang + x.form} className="flex items-center justify-between gap-3 rounded-2xl bg-navy-900/[0.04] px-4 py-2.5 dark:bg-white/[0.05]">
                  <span className="text-2xs font-bold uppercase tracking-wider muted">{x.lang}</span>
                  <span dir={x.dir} className={cn("min-w-0 truncate text-right", x.cls, x.dir === "rtl" && "pb-1 leading-[1.8]")}>
                    {x.form}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        <p className="mt-4 px-2 text-xs muted">Platts (1884), p. {entry.pg}</p>

        <PageScan page={entry.pg} />
      </div>

      <aside className="lg:pt-11">
        <div className="card p-5">
          <p className="text-2xs font-bold uppercase tracking-widest muted">Nearby entries</p>
          <ul className="mt-3 space-y-0.5">
            {nearby.map(({ r, pos }) => {
              const active = pos === row;
              return (
                <li key={pos}>
                  <button
                    onClick={() => !active && onOpen(pos)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left",
                      active ? "bg-gold-400/15 font-bold" : "hover:bg-navy-900/5 dark:hover:bg-white/5"
                    )}
                    aria-current={active ? "true" : undefined}
                  >
                    <span className="truncate text-xs muted">{r[1] || r[4]}</span>
                    <span dir="rtl" lang="ur" className="shrink-0 pb-1 font-urdu text-lg leading-[1.8]">{r[0]}</span>
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
/* Sher — a classical couplet using the word                           */
/* ------------------------------------------------------------------ */

function SherCard({ id, word }: { id: number; word: string }) {
  const [data, setData] = useState<ShersFile | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    loadShers()
      .then((s) => alive && setData(s))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  if (failed) return null;
  const sher = data?.shers[id];
  const poet = sher ? data!.poets[sher[4]] : null;

  /** highlight the headword inside an urdu line */
  const mark = (line: string) =>
    line.split(new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "g")).map((part, i) =>
      part === word ? (
        <span key={i} className="text-gold-300">{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );

  return (
    <div className="card mt-4 animate-fade-up overflow-hidden bg-navy-900 text-white dark:bg-navy-900" style={{ animationDelay: "120ms" }}>
      <div className="p-6 sm:p-8">
        <p className="flex items-center gap-2 text-2xs font-bold uppercase tracking-widest text-gold-300">
          <Sparkles className="h-3.5 w-3.5" aria-hidden /> Sher
          <span dir="rtl" lang="ur" className="font-urdu text-sm normal-case tracking-normal">· شعر</span>
        </p>
        {!sher ? (
          <div className="skeleton mt-4 h-24 rounded-2xl !bg-white/10" aria-hidden />
        ) : (
          <>
            <div dir="rtl" lang="ur" className="font-urdu mt-4 space-y-1 text-center text-xl leading-[2.3] sm:text-2xl sm:leading-[2.3]">
              <p>{mark(sher[0])}</p>
              <p>{mark(sher[1])}</p>
            </div>
            <div className="mt-4 space-y-0.5 text-center text-sm italic text-white/70">
              <p>{sher[2]}</p>
              <p>{sher[3]}</p>
            </div>
            {poet && (
              <p className="mt-4 text-center text-sm text-gold-300">
                — {poet[0]} <span dir="rtl" lang="ur" className="font-urdu">· {poet[1]}</span>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scanned printed page                                                */
/* ------------------------------------------------------------------ */

function PageScan({ page }: { page: number }) {
  const src = pageImageUrl(page);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => setState("loading"), [src]);

  return (
    <div className="card mt-4 animate-fade-up overflow-hidden" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center justify-between gap-3 border-b p-5">
        <span className="eyebrow">
          <ScrollText className="h-3.5 w-3.5" aria-hidden /> Printed page · 1884
        </span>
        <span className="text-xs muted">page {page}</span>
      </div>
      <div className="relative min-h-[280px] bg-navy-900/[0.03] p-3 dark:bg-white/[0.03]">
        {state === "loading" && <div className="skeleton absolute inset-3 !rounded-2xl" aria-hidden />}
        {state === "error" ? (
          <p className="flex min-h-[240px] items-center justify-center p-6 text-center text-sm muted">
            This page couldn’t load right now — please try again.
          </p>
        ) : (
          <img
            key={src}
            src={src}
            alt={`Scanned page ${page} of Platts' Dictionary (1884)`}
            loading="lazy"
            referrerPolicy="no-referrer"
            className={cn(
              "mx-auto block w-full max-w-[720px] rounded-xl bg-white shadow-soft transition-opacity duration-300",
              state === "ready" ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setState("ready")}
            onError={() => setState("error")}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Home                                                                */
/* ------------------------------------------------------------------ */

function Home({ idx, onOpen, onSearch }: { idx: PlattsIndex; onOpen: (row: number) => void; onSearch: (q: string) => void }) {
  const wotd = useMemo(() => {
    const day = new Date().toISOString().slice(0, 10);
    let h = 0;
    for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0;
    // pick a reasonably meaty entry
    for (let t = 0; t < 40; t++) {
      const i = (h + t * 2654435761) % idx.rows.length;
      if (idx.rows[i][4].length > 20 && idx.rows[i][1]) return i;
    }
    return h % idx.rows.length;
  }, [idx]);
  const w = idx.rows[wotd];

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <button onClick={() => onOpen(wotd)} className="card card-hover block w-full overflow-hidden p-0 text-left">
        <div className="grid sm:grid-cols-[1fr_auto]">
          <div className="p-6 sm:p-8">
            <span className="eyebrow"><Sparkles className="h-3.5 w-3.5" aria-hidden /> Word of the day</span>
            <p className="mt-4 flex flex-wrap items-baseline gap-x-3">
              <span className="font-display text-2xl font-semibold">{w[1] || w[0]}</span>
              {w[2] && <span dir="ltr" className="font-deva text-lg muted">{w[2]}</span>}
              {w[3] && <span className="text-2xs font-bold uppercase tracking-wider text-ocean-600 dark:text-gold-400">{w[3]}</span>}
            </p>
            <p className="mt-1.5 text-base muted">{w[4]}</p>
          </div>
          <div className="flex items-center justify-center bg-gold-400/10 px-8 py-6 sm:min-w-[200px]">
            <span dir="rtl" lang="ur" className="pb-3 font-urdu text-5xl font-bold leading-[2]">{w[0]}</span>
          </div>
        </div>
      </button>

      <div>
        <h2 className="pb-4 text-center font-display text-xl font-semibold">Popular words</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {POPULAR.map((p) => (
            <button key={p} onClick={() => onSearch(p)} className="chip border-ocean-600/20 hover:border-gold-400/60 hover:bg-gold-400/10">
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Layers, title: "Three scripts", body: "Every headword in Urdu, Devanagari and Roman — search in any of them." },
          { icon: BookMarked, title: "Real etymology", body: "Persian, Arabic, Sanskrit & Prakrit roots traced for thousands of words." },
          { icon: Search, title: "Search by meaning", body: "Look up the English sense — “beauty” finds ḥusn, jamāl, and more." },
        ].map((c) => (
          <div key={c.title} className="card p-5">
            <c.icon className="h-5 w-5 text-ocean-600 dark:text-gold-400" aria-hidden />
            <p className="mt-2 font-display text-lg font-semibold">{c.title}</p>
            <p className="mt-1 text-sm muted">{c.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div className="skeleton h-44 rounded-3xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="skeleton h-28 rounded-3xl" />
        <div className="skeleton h-28 rounded-3xl" />
        <div className="skeleton h-28 rounded-3xl" />
      </div>
    </div>
  );
}
