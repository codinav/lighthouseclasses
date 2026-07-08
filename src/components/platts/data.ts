/**
 * Client data layer for the Platts dictionary (/platts).
 *
 * Built by `node scripts/build-platts.mjs` into /public/platts:
 * a one-row-per-entry search index plus fixed-size chunks with full entries.
 * Everything is fetched lazily and cached at module level, so it works in the
 * Node build and the static export alike.
 */

/** [urdu, roman, devanagari, source, briefDef, chunk] */
export type PlattsRow = [string, string, string, string, string, number];

export interface PlattsEntry {
  /** urdu (perso-arabic) headword */
  u: string;
  /** devanagari headword */
  d: string;
  /** roman transliteration (may list variants) */
  r: string;
  /** source language (Persian / Arabic / Sanskrit / …) */
  src: string;
  /** etymological derivation */
  ety: string;
  /** part of speech */
  pos: string;
  /** main definition */
  def: string;
  /** printed page in the 1884 edition */
  pg: number;
  /** sub-entries: [phrase, definition, 1 = idiom | 0 = compound] */
  subs?: [string, string, number][];
  /** synonyms (Platts "syn." + Wiktionary) */
  syn?: string[];
  /** antonyms (Wiktionary) */
  ant?: string[];
  /** q.v. cross-references */
  qv?: string[];
  /** usage/register labels (figurative, colloquial …) */
  reg?: string[];
  /** Arabic root letters, space-separated */
  root?: string;
  /** origin chain: [language, form][] */
  chain?: [string, string][];
  /** in-corpus frequency bucket 0–3 */
  fq?: number;
  /** IPA pronunciation (Wiktionary) */
  ipa?: string;
  /** audio URL (Wiktionary) */
  au?: string;
  /** usage examples: [urdu, roman, english][] */
  ex?: [string, string, string][];
  /** derived words (Wiktionary) */
  der?: string[];
  /** related words (Wiktionary) */
  rel?: string[];
  /** word history prose (Wiktionary etymology) */
  wety?: string;
  /** first recorded usage, e.g. "c. 1564" */
  att?: string;
  /** id of a classical sher (couplet) containing this word — see loadShers() */
  sh?: number;
}

/** [urduLine1, urduLine2, romanLine1, romanLine2, poetIdx] */
export type Sher = [string, string, string, string, number];

export interface ShersFile {
  /** [englishName, urduName] */
  poets: [string, string][];
  shers: Sher[];
}

let shersPromise: Promise<ShersFile> | null = null;

export function loadShers(): Promise<ShersFile> {
  if (!shersPromise) {
    shersPromise = fetch("/platts/shers.json").then((r) => {
      if (!r.ok) throw new Error(`shers: HTTP ${r.status}`);
      return r.json();
    });
    shersPromise.catch(() => {
      shersPromise = null;
    });
  }
  return shersPromise;
}

/** Human-readable grammar for Platts' POS abbreviations. */
export function decodePos(pos: string): string {
  const MAP: [RegExp, string][] = [
    [/s\. ?m\. ?f\./, "Noun (masculine & feminine)"],
    [/s\. ?m\./, "Noun, masculine"],
    [/s\. ?f\./, "Noun, feminine"],
    [/adj\./, "Adjective"],
    [/adv\./, "Adverb"],
    [/v\. ?t\./, "Verb, transitive"],
    [/v\. ?n\./, "Verb, intransitive"],
    [/v\. ?i\./, "Verb, intransitive"],
    [/part\. ?adj\./, "Participial adjective"],
    [/part\./, "Participle"],
    [/postpos\.|prep\./, "Postposition"],
    [/conj\./, "Conjunction"],
    [/intj\.|interj\./, "Interjection"],
    [/pron\./, "Pronoun"],
    [/num\./, "Numeral"],
    [/particle/, "Particle"],
    [/imperat\./, "Imperative form"],
  ];
  const parts: string[] = [];
  for (const [re, label] of MAP) if (re.test(pos) && !parts.includes(label)) parts.push(label);
  return parts.join(" & ") || pos;
}

export const FREQ_LABELS = ["Rare", "Occasional", "Common", "Very common"];

export interface PlattsIndexFile {
  v: number;
  updated: string;
  source: string;
  count: number;
  chunkCount: number;
  rows: PlattsRow[];
}

interface Keys {
  u: string;
  r: string;
  d: string;
  g: string;
}

export interface PlattsIndex extends PlattsIndexFile {
  keys: Keys[];
}

/* ------------------------------------------------------------------ */
/* Normalization                                                       */
/* ------------------------------------------------------------------ */

export function stripUrdu(s: string): string {
  return s.replace(/[ً-ٰٕـ]/g, "").normalize("NFC");
}

export function foldRoman(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-͢]/g, "")
    .replace(/[ʻʼʿʾ'’‘`_-]/g, "")
    .replace(/x/g, "kh")
    .replace(/v/g, "w")
    .replace(/q/g, "k")
    .replace(/\s+/g, " ")
    .trim();
}

export const hasUrduScript = (s: string) => /[؀-ۿ]/.test(s);
export const hasDevanagari = (s: string) => /[ऀ-ॿ]/.test(s);

/* ------------------------------------------------------------------ */
/* Loading                                                             */
/* ------------------------------------------------------------------ */

let indexPromise: Promise<PlattsIndex> | null = null;

export function loadIndex(): Promise<PlattsIndex> {
  if (!indexPromise) {
    indexPromise = fetch("/platts/index.json")
      .then((r) => {
        if (!r.ok) throw new Error(`platts index: HTTP ${r.status}`);
        return r.json() as Promise<PlattsIndexFile>;
      })
      .then((file) => {
        const keys: Keys[] = file.rows.map(([u, r, d, , g]) => ({
          u: stripUrdu(u),
          r: foldRoman(r),
          d,
          g: g.toLowerCase(),
        }));
        return { ...file, keys };
      })
      .catch((err) => {
        indexPromise = null;
        throw err;
      });
  }
  return indexPromise;
}

const chunkCache = new Map<number, Promise<PlattsEntry[]>>();

export function loadChunk(chunk: number): Promise<PlattsEntry[]> {
  let p = chunkCache.get(chunk);
  if (!p) {
    p = fetch(`/platts/chunks/${chunk}.json`).then((r) => {
      if (!r.ok) throw new Error(`platts chunk ${chunk}: HTTP ${r.status}`);
      return r.json();
    });
    p.catch(() => chunkCache.delete(chunk));
    chunkCache.set(chunk, p);
  }
  return p;
}

/** Full entry for a row position in the index. */
export async function loadEntry(idx: PlattsIndex, row: number): Promise<PlattsEntry | null> {
  const chunk = idx.rows[row][5];
  const entries = await loadChunk(chunk);
  return entries[row % 300] ?? null;
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Rank matches in any script (or English meaning). Returns row positions. */
export function search(idx: PlattsIndex, query: string, limit = 60): number[] {
  const q = query.trim();
  if (!q) return [];
  const scored: [number, number][] = [];
  const { keys, rows } = idx;

  if (hasUrduScript(q)) {
    const nq = stripUrdu(q);
    for (let i = 0; i < keys.length; i++) {
      const u = keys[i].u;
      if (u === nq) scored.push([i, 100]);
      else if (u.startsWith(nq)) scored.push([i, 60]);
      else if (u.includes(nq)) scored.push([i, 20]);
    }
  } else if (hasDevanagari(q)) {
    for (let i = 0; i < keys.length; i++) {
      const d = keys[i].d;
      if (!d) continue;
      if (d === q) scored.push([i, 100]);
      else if (d.startsWith(q)) scored.push([i, 60]);
      else if (d.includes(q)) scored.push([i, 20]);
    }
  } else {
    const nq = foldRoman(q);
    const eq = q.toLowerCase();
    if (!nq && !eq) return [];
    const wordRe = new RegExp(`(^|[^a-z])${escapeRe(eq)}([^a-z]|$)`);
    for (let i = 0; i < keys.length; i++) {
      const { r, g } = keys[i];
      if (nq && r === nq) scored.push([i, 100]);
      else if (nq && r.startsWith(nq)) scored.push([i, 62]);
      else if (g === eq) scored.push([i, 55]);
      else if (wordRe.test(g)) scored.push([i, 42]);
      else if (nq && r.includes(nq)) scored.push([i, 16]);
      else if (eq.length >= 3 && g.includes(eq)) scored.push([i, 10]);
    }
  }

  return scored
    .sort((a, b) => b[1] - a[1] || rows[a[0]][1].length - rows[b[0]][1].length)
    .slice(0, limit)
    .map(([i]) => i);
}

/* ------------------------------------------------------------------ */
/* Scanned printed page                                                */
/* ------------------------------------------------------------------ */

/** The original 1884 page scan for a printed page (filenames are 4-digit padded). */
export function pageImageUrl(printedPage: number): string {
  const n = String(printedPage).padStart(4, "0");
  return `https://dsal.uchicago.edu/dictionaries/platts/page_images/${n}.jpg`;
}
