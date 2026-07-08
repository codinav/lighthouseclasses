/**
 * Client data layer for the Urdu dictionary.
 *
 * Data is produced by `node scripts/build-dictionary.mjs` into /public/dict:
 * a one-row-per-headword search index plus fixed-size chunks with the full
 * entries. Everything is fetched lazily and cached at module level, so the
 * feature works in both the Node build and the Hostinger static export.
 */

/** [urdu, roman, hindi, posCsv, briefGloss, chunk] */
export type IndexRow = [string, string, string, string, string, number];

export interface DictIndexFile {
  v: number;
  updated: string;
  source: string;
  count: number;
  senses: number;
  chunkCount: number;
  words: IndexRow[];
}

export interface SearchKeys {
  /** headword, diacritics stripped */
  u: string;
  /** romanization, lowercased + accents stripped */
  r: string;
  /** hindi form */
  h: string;
  /** brief gloss, lowercased */
  g: string;
}

export interface DictIndex extends DictIndexFile {
  keys: SearchKeys[];
  /** distinct first letters, in collation order */
  letters: string[];
  /** headword → row position */
  byWord: Map<string, number>;
}

export interface DictExample {
  u: string;
  r?: string;
  e?: string;
}

export interface DictSense {
  g: string;
  t?: string[];
  ex?: DictExample;
}

export interface DictEntry {
  pos: string;
  senses: DictSense[];
  /** canonical form with diacritics */
  c?: string;
  /** romanization */
  r?: string;
  /** hindi (devanagari) form */
  h?: string;
  ipa?: string;
  /** audio url */
  a?: string;
  /** etymology */
  e?: string;
  syn?: string[];
}

/* ------------------------------------------------------------------ */
/* Normalization                                                       */
/* ------------------------------------------------------------------ */

/** Strip Urdu harakat/tatweel so کِتاب matches کتاب. */
export function stripUrduDiacritics(s: string): string {
  return s.replace(/[ً-ٰٕـ]/g, "").normalize("NFC");
}

/**
 * Shared folding — lowercase, strip accents/ayn marks, merge letters people
 * don't distinguish when typing ("mohabbat" ≈ "muhabbat", v ≈ w, q ≈ k).
 */
function foldCommon(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/̃/g, "n") // nasalization: cā̃d → chand, not chad
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ʻʼʿʾʹ'''`-]/g, "")
    .replace(/x/g, "kh")
    .replace(/v/g, "w")
    .replace(/q/g, "k")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fold Wiktionary's scholarly transliteration into everyday Roman Urdu:
 * ś→sh (عشق: 'iśq→ishk), c→ch / ch→chh (چاند: cānd→chand), ž→zh, ġ→gh.
 * Applied to the index side only — queries are already in everyday spelling.
 */
export function normRomanIndex(s: string): string {
  const scheme = s
    .toLowerCase()
    .normalize("NFC")
    .replace(/ch/g, "chh")
    .replace(/c(?!h)/g, "ch")
    .replace(/[śš]/g, "sh")
    .replace(/ž/g, "zh")
    .replace(/ġ/g, "gh");
  return foldCommon(scheme);
}

/** Fold a user-typed query the same way (minus the scheme translation). */
export function normRoman(s: string): string {
  return foldCommon(s);
}

export const hasUrduScript = (s: string) => /[؀-ۿ]/.test(s);
export const hasDevanagari = (s: string) => /[ऀ-ॿ]/.test(s);

/** The Urdu alphabet, in the order a lughat lists it — used for browse. */
export const URDU_ALPHABET = [
  "آ", "ا", "ب", "پ", "ت", "ٹ", "ث", "ج", "چ", "ح", "خ", "د", "ڈ", "ذ",
  "ر", "ڑ", "ز", "ژ", "س", "ش", "ص", "ض", "ط", "ظ", "ع", "غ", "ف", "ق",
  "ک", "گ", "ل", "م", "ن", "ں", "و", "ہ", "ھ", "ء", "ی", "ے",
];

/* ------------------------------------------------------------------ */
/* Loading                                                             */
/* ------------------------------------------------------------------ */

let indexPromise: Promise<DictIndex> | null = null;

export function loadIndex(): Promise<DictIndex> {
  if (!indexPromise) {
    indexPromise = fetch("/dict/index.json")
      .then((r) => {
        if (!r.ok) throw new Error(`dictionary index: HTTP ${r.status}`);
        return r.json() as Promise<DictIndexFile>;
      })
      .then((file) => {
        const keys: SearchKeys[] = file.words.map(([u, r, h, , g]) => ({
          u: stripUrduDiacritics(u),
          r: normRomanIndex(r),
          h,
          g: g.toLowerCase(),
        }));
        const firsts = new Set<string>();
        const byWord = new Map<string, number>();
        file.words.forEach(([w], i) => {
          byWord.set(w, i);
          if (keys[i].u[0]) firsts.add(keys[i].u[0]);
        });
        // Only real letters, in alphabet order — the data also contains
        // numerals and punctuation headwords that shouldn't become tabs.
        const letters = URDU_ALPHABET.filter((l) => firsts.has(l));
        return { ...file, keys, letters, byWord };
      })
      .catch((err) => {
        indexPromise = null; // allow retry
        throw err;
      });
  }
  return indexPromise;
}

const chunkCache = new Map<number, Promise<Record<string, DictEntry[]>>>();

export function loadChunk(chunk: number): Promise<Record<string, DictEntry[]>> {
  let p = chunkCache.get(chunk);
  if (!p) {
    p = fetch(`/dict/chunks/${chunk}.json`).then((r) => {
      if (!r.ok) throw new Error(`dictionary chunk ${chunk}: HTTP ${r.status}`);
      return r.json();
    });
    p.catch(() => chunkCache.delete(chunk));
    chunkCache.set(chunk, p);
  }
  return p;
}

export async function loadWord(idx: DictIndex, word: string): Promise<DictEntry[] | null> {
  const at = idx.byWord.get(word);
  if (at === undefined) return null;
  const chunk = await loadChunk(idx.words[at][5]);
  return chunk[word] ?? null;
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

/**
 * Rank matches for a query in any of the three scripts (or English).
 * Returns row positions into idx.words, best first.
 */
export function searchIndex(idx: DictIndex, query: string, limit = 60): number[] {
  const q = query.trim();
  if (!q) return [];

  const scored: [number, number][] = [];
  const { keys, words } = idx;

  if (hasUrduScript(q)) {
    const nq = stripUrduDiacritics(q);
    for (let i = 0; i < keys.length; i++) {
      const u = keys[i].u;
      if (u === nq) scored.push([i, 100]);
      else if (u.startsWith(nq)) scored.push([i, 60]);
      else if (u.includes(nq)) scored.push([i, 20]);
    }
  } else if (hasDevanagari(q)) {
    for (let i = 0; i < keys.length; i++) {
      const h = keys[i].h;
      if (!h) continue;
      if (h === q) scored.push([i, 100]);
      else if (h.startsWith(q)) scored.push([i, 60]);
      else if (h.includes(q)) scored.push([i, 20]);
    }
  } else {
    // Roman-Urdu matching uses the folded query; English meaning matching
    // must use the plain query (folding turns "love" into "lowe").
    const nq = normRoman(q);
    const eq = q.toLowerCase().trim();
    if (!nq && !eq) return [];
    const wordRe = new RegExp(`(^|[^a-z])${escapeRe(eq)}([^a-z]|$)`);
    for (let i = 0; i < keys.length; i++) {
      const { r, g } = keys[i];
      if (nq && r === nq) {
        scored.push([i, 100]);
        continue;
      }
      if (nq && r.startsWith(nq)) {
        scored.push([i, 60]);
        continue;
      }
      // English meaning lookup — whole word beats substring
      if (g === eq) scored.push([i, 55]);
      else if (wordRe.test(g)) scored.push([i, 40]);
      else if (nq && r.includes(nq)) scored.push([i, 15]);
      else if (eq.length >= 3 && g.includes(eq)) scored.push([i, 10]);
    }
  }

  return scored
    .sort((a, b) => b[1] - a[1] || words[a[0]][0].length - words[b[0]][0].length)
    .slice(0, limit)
    .map(([i]) => i);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ------------------------------------------------------------------ */
/* Authentic printed sources (scanned dictionaries on archive.org)     */
/* ------------------------------------------------------------------ */

export interface SourceBook {
  key: string;
  id: string;
  title: string;
  author: string;
  year: number;
  publisher: string;
  script: string;
  server: string;
  dir: string;
  subPrefix: string;
  leafCount: number;
  /** printed page = leaf − pageOffset (null if unknown) */
  pageOffset: number | null;
  /**
   * [headword, leaf, box?] anchors, alphabetical — built by
   * scripts/build-source-pages.mjs. box = [l, t, r, b] in permille of the page.
   */
  entries: ([string, number] | [string, number, number[]])[];
}

/**
 * A classical Urdu-Urdu lughat (scanned on archive.org). Its Urdu OCR is too
 * noisy for exact word→page lookup, so pages are interpolated from an
 * abjad-ordered anchor table built by scripts/build-urdu-sources.mjs.
 */
export interface UrduSourceBook {
  kind: "ur";
  key: string;
  id: string;
  title: string;
  titleUr: string;
  author: string;
  year: number;
  server: string;
  dir: string;
  subPrefix: string;
  leafCount: number;
  /** rank space the anchors live in (size of the collation-sorted word list) */
  wordCount: number;
  /** [rank, leaf] anchors, monotonic in rank — for linear interpolation */
  anchors: [number, number][];
  /** exact headword→leaf map (words read directly off the scanned pages) */
  direct?: Record<string, number>;
}

export interface SourcesFile {
  v: number;
  updated: string;
  books: SourceBook[];
  urduBooks?: UrduSourceBook[];
}

let sourcesPromise: Promise<SourcesFile> | null = null;

export function loadSources(): Promise<SourcesFile> {
  if (!sourcesPromise) {
    sourcesPromise = fetch("/dict/sources.json").then((r) => {
      if (!r.ok) throw new Error(`dictionary sources: HTTP ${r.status}`);
      return r.json();
    });
    sourcesPromise.catch(() => {
      sourcesPromise = null;
    });
  }
  return sourcesPromise;
}

export const normalizeEnglish = (w: string) => w.toLowerCase().replace(/[^a-z]/g, "");

export interface SourceHit {
  leaf: number;
  /** printed page number, when the offset is known */
  printed: number | null;
  /** true when the word itself was OCR-anchored (vs. alphabetical interpolation) */
  exact: boolean;
  /** the headword's own position on the page, when OCR captured it */
  box: WordBox | null;
}

/** Binary-search the alphabetical anchors for the page containing `word`. */
export function lookupSourcePage(book: SourceBook, word: string): SourceHit | null {
  const w = normalizeEnglish(word);
  if (w.length < 2 || !book.entries.length) return null;
  let lo = 0,
    hi = book.entries.length; // first index with entry > w
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (book.entries[mid][0] <= w) lo = mid + 1;
    else hi = mid;
  }
  const at = Math.max(0, lo - 1);
  const [anchor, leaf, rawBox] = book.entries[at];
  // Reject lookups far outside the book's alphabet coverage (e.g. numerals)
  if (at === 0 && anchor > w) return null;
  const exact = anchor === w;
  return {
    leaf,
    printed: book.pageOffset === null ? null : leaf - book.pageOffset,
    exact,
    box:
      exact && rawBox
        ? { l: rawBox[0], t: rawBox[1], r: rawBox[2], b: rawBox[3], pw: 1000, ph: 1000 }
        : null,
  };
}

export interface UrduHit {
  leaf: number;
  /** how many anchors bracket the estimate on each side — a rough confidence */
  gap: number;
  /** true when the word was found exactly (read directly off the page) */
  exact: boolean;
}

/**
 * Page for a word: exact when it was read directly off a scanned page,
 * otherwise linear interpolation between the book's monotonic anchors.
 */
export function interpolateUrduPage(book: UrduSourceBook, rank: number, word?: string): UrduHit | null {
  if (word && book.direct) {
    const leaf = book.direct[stripUrduDiacritics(word)];
    if (leaf !== undefined) return { leaf, gap: 1, exact: true };
  }
  const a = book.anchors;
  if (!a.length) return null;
  // binary search: first anchor with rank > target
  let lo = 0,
    hi = a.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid][0] <= rank) lo = mid + 1;
    else hi = mid;
  }
  const hiI = Math.min(lo, a.length - 1);
  const loI = Math.max(0, lo - 1);
  const [r0, l0] = a[loI];
  const [r1, l1] = a[hiI];
  let leaf: number;
  if (r1 === r0) leaf = l0;
  else if (rank <= r0) leaf = l0;
  else if (rank >= r1) leaf = l1;
  else leaf = Math.round(l0 + ((l1 - l0) * (rank - r0)) / (r1 - r0));
  leaf = Math.min(Math.max(leaf, 0), book.leafCount - 1);
  return { leaf, gap: Math.max(l1 - l0, 1), exact: false };
}

/** A word occurrence on a scanned page, in full-resolution pixel space. */
export interface WordBox {
  l: number;
  t: number;
  r: number;
  b: number;
  /** page dimensions the box is relative to */
  pw: number;
  ph: number;
}

const boxCache = new Map<string, Promise<Map<number, WordBox[]>>>();

/** Fields shared by both book kinds, enough to address the IA scan/OCR APIs. */
export type ScanBook = Pick<SourceBook, "key" | "id" | "server" | "dir" | "subPrefix" | "leafCount">;

/**
 * Exact highlight boxes from the Internet Archive's full-text search
 * (the same service that powers highlights in their own BookReader).
 * Returns leaf → boxes. Failures resolve to an empty map — highlights are
 * an enhancement, never a blocker.
 */
export function loadWordBoxes(book: ScanBook, word: string): Promise<Map<number, WordBox[]>> {
  const key = `${book.key}:${word}`;
  let p = boxCache.get(key);
  if (!p) {
    const url =
      `https://${book.server}/fulltext/inside.php?item_id=${encodeURIComponent(book.id)}` +
      `&doc=${encodeURIComponent(book.subPrefix)}&path=${encodeURIComponent(book.dir)}` +
      `&q=${encodeURIComponent(word)}`;
    p = fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        const byLeaf = new Map<number, WordBox[]>();
        for (const m of data?.matches ?? []) {
          for (const par of m?.par ?? []) {
            const pw = par?.page_width, ph = par?.page_height;
            if (!pw || !ph) continue;
            for (const box of par?.boxes ?? []) {
              const leaf = box?.page ?? par?.page;
              if (typeof leaf !== "number") continue;
              const list = byLeaf.get(leaf) ?? [];
              list.push({ l: box.l, t: box.t, r: box.r, b: box.b, pw, ph });
              byLeaf.set(leaf, list);
            }
          }
        }
        return byLeaf;
      })
      .catch(() => new Map<number, WordBox[]>());
    boxCache.set(key, p);
  }
  return p;
}

export function sourcePageImageUrl(book: ScanBook, leaf: number, scale = 4): string {
  const zip = `${book.dir}/${book.subPrefix}_jp2.zip`;
  const file = `${book.subPrefix}_jp2/${book.subPrefix}_${String(leaf).padStart(4, "0")}.jp2`;
  return `https://${book.server}/BookReader/BookReaderImages.php?zip=${encodeURIComponent(zip)}&file=${encodeURIComponent(file)}&id=${encodeURIComponent(book.id)}&scale=${scale}&rotate=0`;
}

export function sourceArchiveUrl(book: Pick<SourceBook, "id">, leaf?: number): string {
  return leaf === undefined
    ? `https://archive.org/details/${book.id}`
    : `https://archive.org/details/${book.id}/page/n${leaf}/mode/1up`;
}

/* ------------------------------------------------------------------ */
/* Word of the day                                                     */
/* ------------------------------------------------------------------ */

/** Deterministic pick per calendar day, biased toward "nice" entries. */
export function wordOfTheDay(idx: DictIndex): number {
  const good: number[] = [];
  for (let i = 0; i < idx.words.length; i++) {
    const [, r, h, pos, brief] = idx.words[i];
    if (
      r && h && brief.length >= 3 && brief.length <= 60 &&
      /Noun|Adjective|Verb/.test(pos) &&
      !/inflection of|plural of|oblique|vocative|alternative|letter of/i.test(brief)
    )
      good.push(i);
  }
  const pool = good.length ? good : idx.words.map((_, i) => i);
  const day = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < day.length; i++) hash = (hash * 31 + day.charCodeAt(i)) >>> 0;
  return pool[hash % pool.length];
}
