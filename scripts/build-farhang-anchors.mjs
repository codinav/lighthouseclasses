/**
 * Build Farhang-e-Asafia's word→page anchors from hand-read guide words.
 *
 * Off-the-shelf OCR can't read this Nastaliq lithograph, so the first headword
 * ("guide word") printed at the top of a sample of pages was read by vision
 * (see scripts/.cache/farhang-guidewords.json: leaf → guide word). Each guide
 * word is placed by Urdu collation into the same sorted word list the app uses
 * (public/dict/index.json), giving a [rank, leaf] anchor. A longest
 * non-decreasing-subsequence pass drops any misread that breaks alphabetical
 * order, leaving a clean, dense, monotonic map for accurate interpolation.
 *
 * Usage: node scripts/build-farhang-anchors.mjs
 * Writes the Farhang book (Farhang-only) into public/dict/sources.json.
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCES = join(ROOT, "public", "dict", "sources.json");
const INDEX = join(ROOT, "public", "dict", "index.json");
const GUIDE = join(ROOT, "scripts", ".cache", "farhang-guidewords.json");

const BOOK = {
  kind: "ur",
  key: "farhang",
  id: "farhang-e-asafia-mukkamal",
  title: "Farhang-e-Asafia",
  titleUr: "فرہنگِ آصفیہ",
  author: "Sayyid Ahmad Dehlvi",
  year: 1908,
  subPrefix: "Farhang-e-Asafia Mukkamalفرہنگِ آصفیہ (مکمل)",
  leafCount: 2615,
};

const collator = new Intl.Collator("ur");
const stripDiacritics = (s) => s.replace(/[ً-ْٰٓٔـ]/g, "").normalize("NFC");

/** Longest non-decreasing subsequence of leaf over points sorted by rank. */
function lisByLeaf(points) {
  const n = points.length;
  const tails = [];
  const prev = new Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    const v = points[i].leaf;
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (points[tails[mid]].leaf <= v) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0) prev[i] = tails[lo - 1];
    tails[lo] = i;
  }
  const chain = [];
  let at = tails.length ? tails[tails.length - 1] : -1;
  while (at !== -1) { chain.push(points[at]); at = prev[at]; }
  return chain.reverse();
}

const index = JSON.parse(await readFile(INDEX, "utf8"));
const words = index.words.map((r) => stripDiacritics(r[0]));
const N = words.length;

/** rank = number of list words that collate <= w (insertion position). */
function rankOf(w) {
  const t = stripDiacritics(w);
  let lo = 0, hi = N;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (collator.compare(words[mid], t) <= 0) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

const guide = JSON.parse(await readFile(GUIDE, "utf8"));
const raw = Object.entries(guide)
  .map(([leaf, word]) => ({ leaf: Number(leaf), rank: rankOf(word), word }))
  .sort((a, b) => a.rank - b.rank || a.leaf - b.leaf);

console.log(`${raw.length} guide words read`);
const chain = lisByLeaf(raw);
const dropped = raw.filter((r) => !chain.includes(r));
console.log(`${chain.length} kept after monotonic cleaning, ${dropped.length} dropped as misreads:`);
console.log("  dropped:", dropped.map((d) => `${d.word}@${d.leaf}`).join(", ") || "none");

// dedupe equal rank/leaf, emit [rank, leaf]
const anchors = [];
let lastRank = -1, lastLeaf = -1;
for (const { rank, leaf } of chain) {
  if (rank === lastRank || leaf === lastLeaf) continue;
  anchors.push([rank, leaf]);
  lastRank = rank; lastLeaf = leaf;
}
const gaps = anchors.slice(1).map(([, l], i) => l - anchors[i][1]);
console.log(`${anchors.length} anchors; leaf gaps min ${Math.min(...gaps)} max ${Math.max(...gaps)} mean ${(gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(1)}`);

// Exact lookup: every guide word maps to the precise leaf it was read on
// (first occurrence). This makes any searched headword that IS a guide word
// land exactly, sidestepping interpolation drift and the آ/ا collation quirk.
const direct = {};
for (const { leaf, word } of raw) {
  const k = stripDiacritics(word);
  if (!(k in direct) || leaf < direct[k]) direct[k] = leaf;
}
console.log(`${Object.keys(direct).length} exact word→page entries`);

const meta = await (await fetch(`https://archive.org/metadata/${BOOK.id}`)).json();

const sources = JSON.parse(await readFile(SOURCES, "utf8"));
sources.urduBooks = [{ ...BOOK, server: meta.server, dir: meta.dir, wordCount: N, anchors, direct }];
sources.updated = new Date().toISOString().slice(0, 10);
await writeFile(SOURCES, JSON.stringify(sources));
console.log(`✓ wrote Farhang (only) with ${anchors.length} guide-word anchors`);
