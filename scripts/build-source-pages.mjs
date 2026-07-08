/**
 * Build the "authentic source page" index used by /dictionary.
 *
 * For each scanned dictionary on the Internet Archive we extract candidate
 * headwords per page from the OCR, then keep the longest alphabetically
 * non-decreasing subsequence (the book itself is alphabetical, so OCR noise
 * violates monotonicity and falls out). The result maps any English word to
 * the scanned page where it is defined, via binary search.
 *
 * Usage: node scripts/build-source-pages.mjs
 * Output: public/dict/sources.json
 * Downloads are cached in scripts/.cache/.
 */
import { createWriteStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, "scripts", ".cache");
const OUT = join(ROOT, "public", "dict", "sources.json");

const BOOKS = [
  {
    key: "standard",
    id: "in.ernet.dli.2015.85272",
    subPrefix: "2015.85272.The-Standard-English-Urdu-Dictionary",
    title: "The Standard English-Urdu Dictionary",
    author: "Maulvi Abdul Haq (Baba-e-Urdu)",
    year: 1937,
    publisher: "Anjuman Taraqqi-e-Urdu (India)",
    script: "Urdu",
    ocr: "djvuxml",
    ocrFile: "2015.85272.The-Standard-English-Urdu-Dictionary_djvu.xml",
  },
  {
    key: "newcentury",
    id: "dli.ernet.14754",
    subPrefix: "14754-The New Century English Urdu Dictionary (1936)",
    title: "The New Century English-Urdu Dictionary",
    author: "Saiyid Tafazzul Husain",
    year: 1936,
    publisher: "New Century Press",
    script: "Roman Urdu",
    ocr: "searchtext",
    ocrFile: "14754-The New Century English Urdu Dictionary (1936)_hocr_searchtext.txt.gz",
    pageIndexFile: "14754-The New Century English Urdu Dictionary (1936)_hocr_pageindex.json.gz",
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

async function download(id, name) {
  const dest = join(CACHE, name.replace(/[/\\]/g, "_"));
  try {
    if ((await stat(dest)).size > 0) return dest;
  } catch {}
  const url = `https://archive.org/download/${id}/${encodeURIComponent(name)}`;
  console.log(`  downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  await mkdir(CACHE, { recursive: true });
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return dest;
}

/** Headword candidate at line start: capitalized, plain English. */
const CANDIDATE = /^([A-Z][A-Za-z'’-]{1,24})[,.;:]?$/;

const normalizeWord = (w) => w.toLowerCase().replace(/[^a-z]/g, "");

/**
 * Longest non-decreasing subsequence (patience sorting, O(n log n)) over the
 * alphabetical sort keys, in document order. Returns the surviving items.
 */
function cleanMonotonic(items) {
  const n = items.length;
  const tailIdx = []; // tailIdx[len] = index of smallest tail for LIS of that length
  const prev = new Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    const k = items[i].k;
    let lo = 0, hi = tailIdx.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (items[tailIdx[mid]].k <= k) lo = mid + 1; // non-decreasing → <=
      else hi = mid;
    }
    if (lo > 0) prev[i] = tailIdx[lo - 1];
    tailIdx[lo] = i;
  }
  const out = [];
  let at = tailIdx.length ? tailIdx[tailIdx.length - 1] : -1;
  while (at !== -1) {
    out.push(items[at]);
    at = prev[at];
  }
  return out.reverse();
}

/** Mode of (leaf − printed page digit found in the running head). */
function pageOffset(digitPairs) {
  const counts = new Map();
  for (const [leaf, num] of digitPairs) {
    const off = leaf - num;
    counts.set(off, (counts.get(off) ?? 0) + 1);
  }
  let best = null, bestCount = 0;
  for (const [off, c] of counts) if (c > bestCount) { best = off; bestCount = c; }
  return bestCount >= 20 ? best : null;
}

/* ------------------------------------------------------------------ */
/* Per-format extraction → candidates [{k: sortKey, leaf}], digitPairs  */
/* ------------------------------------------------------------------ */

async function extractDjvuXml(path) {
  const xml = await readFile(path, "utf8");
  const candidates = [];
  const digitPairs = [];
  let leafCount = 0;
  let leaf = -1;
  let pageW = 0;
  let pageH = 0;
  let linesSeen = 0;
  let atLineStart = false;
  // The file is line-structured; a cheap scanner beats a real XML parser here.
  for (const line of xml.split("\n")) {
    const obj = line.match(/<OBJECT [^>]*height="(\d+)"[^>]*width="(\d+)"/);
    if (obj) {
      pageH = parseInt(obj[1], 10);
      pageW = parseInt(obj[2], 10);
      continue;
    }
    const page = line.match(/<PARAM name="PAGE" value=".*_(\d{4})\.djvu"/);
    if (page) {
      leaf = parseInt(page[1], 10);
      leafCount = Math.max(leafCount, leaf + 1);
      linesSeen = 0;
      continue;
    }
    if (leaf < 0) continue;
    if (line.includes("<LINE>")) {
      linesSeen++;
      atLineStart = true;
      continue;
    }
    const word = line.match(/^<WORD coords="(\d+),(\d+),(\d+),(\d+)[^"]*"[^>]*>([^<]+)<\/WORD>/);
    if (!word) continue;
    const text = word[5].trim();
    // Running head: printed page number near the top of the page
    if (linesSeen <= 4 && /^\d{1,4}$/.test(text)) digitPairs.push([leaf, parseInt(text, 10)]);
    // Only the first word of each line can start an entry. Words in the
    // running head (guide words like "LOVE … LOW") still anchor the page
    // mapping, but carry no box — highlights should mark the real entry.
    const isFirst = atLineStart;
    atLineStart = false;
    if (!isFirst) continue;
    const m = text.match(CANDIDATE);
    if (m) {
      const k = normalizeWord(m[1]);
      if (k.length < 2) continue;
      if (linesSeen > 3 && pageW && pageH) {
        // djvu coords are left,bottom,right,top (y grows downward)
        const [l, b, r, t] = [word[1], word[2], word[3], word[4]].map(Number);
        const per = (v, max) => Math.max(0, Math.min(1000, Math.round((v / max) * 1000)));
        candidates.push({ k, leaf, box: [per(l, pageW), per(t, pageH), per(r, pageW), per(b, pageH)] });
      } else {
        candidates.push({ k, leaf });
      }
    }
  }
  return { candidates, digitPairs, leafCount };
}

async function extractSearchtext(txtPath, pageIndexPath) {
  const text = gunzipSync(await readFile(txtPath)).toString("utf8");
  const pageIndex = JSON.parse(gunzipSync(await readFile(pageIndexPath)).toString("utf8"));
  const candidates = [];
  const digitPairs = [];
  for (let leaf = 0; leaf < pageIndex.length; leaf++) {
    const [s, e] = pageIndex[leaf];
    const lines = text.slice(s, e).split("\n");
    lines.slice(0, 4).forEach((l) => {
      const d = l.trim().match(/^(\d{1,4})$/);
      if (d) digitPairs.push([leaf, parseInt(d[1], 10)]);
    });
    for (const l of lines) {
      const first = l.trim().split(/\s+/, 1)[0] ?? "";
      const m = first.match(CANDIDATE);
      if (m) {
        const k = normalizeWord(m[1]);
        if (k.length >= 2) candidates.push({ k, leaf });
      }
    }
  }
  return { candidates, digitPairs, leafCount: pageIndex.length };
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

const out = { v: 1, updated: new Date().toISOString().slice(0, 10), books: [] };

for (const book of BOOKS) {
  console.log(`→ ${book.title}`);

  // Item metadata gives us the image server + path for BookReaderImages.php
  const meta = await (await fetch(`https://archive.org/metadata/${book.id}`)).json();

  const ocrPath = await download(book.id, book.ocrFile);
  const { candidates, digitPairs, leafCount } =
    book.ocr === "djvuxml"
      ? await extractDjvuXml(ocrPath)
      : await extractSearchtext(ocrPath, await download(book.id, book.pageIndexFile));

  console.log(`  ${candidates.length} raw candidates`);
  const clean = cleanMonotonic(candidates);
  console.log(`  ${clean.length} after alphabetical cleaning`);

  // Dedupe consecutive repeats, keep at most 8 per leaf to bound size.
  // Entries carry the headword's box (permille of page) when the OCR has it,
  // so the UI can highlight instantly without waiting on IA's search API.
  const perLeaf = new Map();
  const entries = [];
  let last = "";
  for (const { k, leaf, box } of clean) {
    if (k === last) {
      // Same word again (e.g. guide word then its entry): adopt the body
      // occurrence's box so the highlight marks the definition itself.
      const prev = entries[entries.length - 1];
      if (prev && prev[0] === k && prev[1] === leaf && !prev[2] && box) prev.push(box);
      continue;
    }
    const c = perLeaf.get(leaf) ?? 0;
    if (c >= 8) continue;
    perLeaf.set(leaf, c + 1);
    entries.push(box ? [k, leaf, box] : [k, leaf]);
    last = k;
  }

  const offset = pageOffset(digitPairs);
  console.log(`  ${entries.length} index entries, page offset ${offset}, covering ${perLeaf.size} leaves`);

  out.books.push({
    key: book.key,
    id: book.id,
    title: book.title,
    author: book.author,
    year: book.year,
    publisher: book.publisher,
    script: book.script,
    server: meta.server,
    dir: meta.dir,
    subPrefix: book.subPrefix,
    leafCount,
    pageOffset: offset,
    entries,
  });
}

await writeFile(OUT, JSON.stringify(out));
const size = (await stat(OUT)).size;
console.log(`✓ ${OUT.replace(ROOT + "/", "")} — ${(size / 1024).toFixed(0)} KB`);
