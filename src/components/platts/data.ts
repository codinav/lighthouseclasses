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
  /** normalized urdu headword */
  u: string;
  /** strict roman variants (first = headword's own romanization) */
  rv: string[];
  /** loose roman variants (vowel-folded) */
  lv: string[];
  /** consonant skeletons of the loose variants */
  sv: string[];
  /** folded devanagari headword */
  d: string;
  /** lowercased brief definition */
  g: string;
}

export interface PlattsIndex extends PlattsIndexFile {
  keys: Keys[];
}

/* ------------------------------------------------------------------ */
/* Normalization                                                       */
/* ------------------------------------------------------------------ */

/**
 * Normalize Urdu script for matching. Platts' digitisation mixes Arabic and
 * Urdu codepoints (ي/ی, ك/ک, ه/ہ …), while users type on Urdu keyboards —
 * fold both sides onto one repertoire and drop diacritics.
 */
export function stripUrdu(s: string): string {
  return s
    .normalize("NFC")
    .replace(/[ً-ٰٕٓٔـ]/g, "")
    .replace(/[يىئے]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[هةھ]/g, "ہ")
    .replace(/[آأٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ں/g, "ن")
    .replace(/ء/g, "");
}

export function foldRoman(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-͢]/g, "")
    .replace(/[ʻʼʿʾ'’‘`_.·-]/g, "")
    .replace(/x/g, "kh")
    .replace(/v/g, "w")
    .replace(/q/g, "k")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Modern romanization types چ as "ch" and چھ as "chh"; Platts writes ć / ćh,
 * which fold to "c" / "ch". Map typed queries onto Platts' convention.
 */
function chFix(s: string): string {
  return s.replace(/chh/g, "\x01").replace(/ch/g, "c").replace(/\x01/g, "ch");
}

/**
 * Loose fold: conflate the spelling families people actually type
 * (mohabbat/muhabbat, nasheman/nisheman, zindagi/jindagi …) by collapsing
 * every vowel run to one letter and merging near-equivalent consonants.
 */
function looseRoman(s: string): string {
  return s
    .replace(/ch/g, "c")
    .replace(/sh/g, "s")
    .replace(/ph/g, "f")
    .replace(/z/g, "j")
    .replace(/[aeiouy]+/g, "a")
    .replace(/(.)\1+/g, "$1");
}

/** Consonant skeleton of a loose form — the last-resort match (khwab/khawab). */
function skeleton(loose: string): string {
  return loose.replace(/(?!^)a/g, "");
}

/** Fold Devanagari for matching: drop nuktas, unify explicit nasals with anusvara. */
function foldDeva(s: string): string {
  return s.normalize("NFD").replace(/़/g, "").normalize("NFC").replace(/[नम]्(?=[क-ह])/g, "ं");
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
        const keys: Keys[] = file.rows.map(([u, r, d, , g]) => {
          const rv = foldRoman(r)
            .split(/\s*[,;]\s*/)
            .filter((x) => x && x !== "lit");
          if (!rv.length) rv.push("");
          const lv = rv.map(looseRoman);
          return {
            u: stripUrdu(u),
            rv,
            lv,
            sv: lv.map(skeleton),
            d: d && foldDeva(d),
            g: g.toLowerCase(),
          };
        });
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

/**
 * Weighted edit distance between folded roman forms: vowel-ish edits are
 * cheap (that's where spellings legitimately vary), consonant edits dear.
 * Capped at 12 — beyond that the words are simply different.
 */
const DEL_CHEAP = new Set("aeiouh");
const SUB_CHEAP = new Set("aeiouyh");
function editDist(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 6) return 12;
  const cost = (c: string) => (DEL_CHEAP.has(c) ? 1 : 2);
  let prev: number[] = [0];
  for (let j = 1; j <= n; j++) prev[j] = prev[j - 1] + cost(b[j - 1]);
  for (let i = 1; i <= m; i++) {
    const ca = a[i - 1];
    const ka = cost(ca);
    const cur: number[] = [prev[0] + ka];
    for (let j = 1; j <= n; j++) {
      const cb = b[j - 1];
      const sub = ca === cb ? 0 : SUB_CHEAP.has(ca) && SUB_CHEAP.has(cb) ? 1 : 2;
      cur[j] = Math.min(prev[j] + ka, cur[j - 1] + cost(cb), prev[j - 1] + sub);
    }
    prev = cur;
  }
  return Math.min(prev[n], 12);
}

/** Distance to the entry's own romanization; cross-referenced variants count +1. */
function effDist(nq: string, rv: string[]): number {
  let d = editDist(nq, rv[0]);
  for (let i = 1; i < rv.length && d > 1; i++) d = Math.min(d, editDist(nq, rv[i]) + 1);
  return Math.min(d, 12);
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
      if (u === nq) scored.push([i, 1000]);
      else if (u.startsWith(nq)) scored.push([i, 620]);
      else if (u.includes(nq)) scored.push([i, 200]);
    }
  } else if (hasDevanagari(q)) {
    const nq = foldDeva(q);
    for (let i = 0; i < keys.length; i++) {
      const d = keys[i].d;
      if (!d) continue;
      if (d === nq) scored.push([i, 1000]);
      else if (d.startsWith(nq)) scored.push([i, 620]);
      else if (d.includes(nq)) scored.push([i, 200]);
    }
  } else {
    const nq = chFix(foldRoman(q));
    const lq = looseRoman(nq);
    const sq = skeleton(lq);
    const eq = q.toLowerCase();
    if (!nq && !eq) return [];
    const wordRe = new RegExp(`(^|[^a-z])${escapeRe(eq)}([^a-z]|$)`);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      let s = 0;
      let m: RegExpExecArray | null;
      if (k.rv[0] === nq) s = 1000;
      else if (k.rv.includes(nq)) s = 930;
      else if (nq && k.rv[0].startsWith(nq)) s = 620;
      else if (nq && k.rv.some((v) => v.startsWith(nq))) s = 600;
      else if (k.g === eq) s = 550;
      else if ((m = wordRe.exec(k.g))) s = 500 - Math.min(40, Math.round(m.index / 3));
      else if (k.lv.includes(lq)) s = 480 - 8 * effDist(nq, k.rv);
      else if (lq.length >= 2 && k.lv[0].startsWith(lq)) s = 340;
      else if (lq.length >= 2 && k.lv.some((v) => v.startsWith(lq))) s = 330;
      else if (sq.length >= 2 && k.sv.includes(sq)) s = 260 - 8 * effDist(nq, k.rv);
      else if (nq.length >= 3 && k.rv.some((v) => v.includes(nq))) s = 160;
      else if (eq.length >= 3 && k.g.includes(eq)) s = 100;
      if (s) scored.push([i, s]);
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
