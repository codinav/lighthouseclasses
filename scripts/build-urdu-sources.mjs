/**
 * Build the classical Urdu-Urdu lughat source index used by /dictionary.
 *
 * These are public-domain scans on the Internet Archive. Unlike the English
 * books, their Urdu OCR is far too noisy to trust for exact word→page lookup
 * (IA full-text search returns confident false positives). Instead we exploit
 * the one thing that IS reliable — the books are strictly alphabetical — and
 * build an abjad-ordered anchor table:
 *
 *   • probe IA full-text search with a spread of real Urdu headwords,
 *   • express each word by its RANK in our collation-sorted word list
 *     (a ready-made abjad coordinate — see build-dictionary.mjs),
 *   • keep only the longest rank-monotonic subsequence of (rank → leaf)
 *     points (LIS cleaning); false positives break monotonicity and drop out.
 *
 * At runtime a word's page is interpolated between anchors, and a live
 * full-text query supplies an exact highlight when it lands near the estimate.
 *
 * Usage: node scripts/build-urdu-sources.mjs
 * Output: merges an `urduBooks` array into public/dict/sources.json
 */
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCES = join(ROOT, "public", "dict", "sources.json");
const INDEX = join(ROOT, "public", "dict", "index.json");
const CACHE = join(ROOT, "scripts", ".cache");

const BOOKS = [
  {
    key: "feroz",
    id: "feroz-ul-lughat-urdu-dictionary",
    subPrefix: "Feroz ul Lughat - Urdu Dictionary",
    title: "Feroz-ul-Lughat",
    titleUr: "فیروز اللغات",
    author: "Maulvi Ferozuddin",
    year: 1897,
    leafCount: 1481,
  },
  {
    key: "farhang",
    id: "farhang-e-asafia-mukkamal",
    subPrefix: "Farhang-e-Asafia Mukkamalفرہنگِ آصفیہ (مکمل)",
    title: "Farhang-e-Asafia",
    titleUr: "فرہنگِ آصفیہ",
    author: "Sayyid Ahmad Dehlvi",
    year: 1908,
    leafCount: 2615,
  },
  // Noor-ul-Lughat: only a partial vol-1 scan (ا–ب) is on IA, and its Urdu OCR
  // is too noisy to map even that range reliably — excluded until a complete,
  // cleaner scan is available. Jame-ul-Lughat isn't digitised on IA at all.
];

// Probe every word (step = N/PROBE_COUNT ≈ 1) so anchors are dense enough for
// ~1-page interpolation. Raw results are cached, so this long job runs once.
const PROBE_COUNT = 9000;
const CANDIDATES_PER_PROBE = 8;
const CONCURRENCY = 6;
const CHECKPOINT_EVERY = 250; // flush the probe cache this often (resumable)
// A dictionary headword hugs the right edge of its (RTL) column; mid-text
// mentions sit elsewhere. boxScore = distance from a column's right edge, so
// only low scores are real entries. This filters false "mentions" and, for a
// partial volume, keeps anchors to the letters it actually contains.
const HEADWORD_MAX_SCORE = 0.14;

/* ------------------------------------------------------------------ */

async function iaMeta(id) {
  const d = await (await fetch(`https://archive.org/metadata/${id}`)).json();
  return { server: d.server, dir: d.dir };
}

/** Full-text search → [{ leaf, boxScore }] (best-first). Empty on any error. */
async function fullTextLeaves(book, word) {
  const url =
    `https://${book.server}/fulltext/inside.php?item_id=${encodeURIComponent(book.id)}` +
    `&doc=${encodeURIComponent(book.subPrefix)}&path=${encodeURIComponent(book.dir)}` +
    `&q=${encodeURIComponent(word)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const out = [];
    for (const m of data?.matches ?? []) {
      for (const par of m?.par ?? []) {
        const pw = par?.page_width;
        for (const b of par?.boxes ?? []) {
          const leaf = b?.page ?? par?.page;
          if (typeof leaf !== "number") continue;
          // headword-ness: RTL entries hug a column's right edge
          const r = pw ? b.r / pw : 0.5;
          const boxScore = pw ? Math.min(Math.abs(1 - r), Math.abs(0.5 - r)) : 1;
          out.push({ leaf, boxScore });
        }
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** Longest non-decreasing subsequence of `leaf` over points pre-sorted by rank. */
function lisByLeaf(points) {
  const n = points.length;
  const tails = [];
  const prev = new Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    const v = points[i].leaf;
    let lo = 0,
      hi = tails.length;
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
  while (at !== -1) {
    chain.push(points[at]);
    at = prev[at];
  }
  return chain.reverse();
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

/**
 * Probe full-text search for each rank and cache the raw candidate leaves to
 * disk, so the anchor-building logic below can be re-tuned without re-hitting
 * the network. Returns [{ rank, leaves: [{leaf, boxScore}] }].
 */
async function probeBook(book, words, probeRanks) {
  const cacheFile = join(CACHE, `urdu-probes-${book.key}.json`);
  let cached = {};
  try {
    if ((await stat(cacheFile)).size) cached = JSON.parse(await readFile(cacheFile, "utf8"));
  } catch {}

  const todo = probeRanks.filter((r) => !(r in cached));
  if (todo.length) {
    console.log(`  probing ${todo.length} new words (${probeRanks.length - todo.length} cached)…`);
    await mkdir(CACHE, { recursive: true });
    let done = 0;
    await mapLimit(todo, CONCURRENCY, async (rank) => {
      cached[rank] = await fullTextLeaves(book, words[rank]);
      if (++done % CHECKPOINT_EVERY === 0) {
        await writeFile(cacheFile, JSON.stringify(cached)); // resumable
        console.log(`    …${done}/${todo.length} (checkpointed)`);
      }
    });
    await writeFile(cacheFile, JSON.stringify(cached));
  }

  return probeRanks.map((rank) => ({
    rank,
    // Keep only headword-position candidates — real entries, not mentions.
    leaves: (cached[rank] ?? [])
      .filter((c) => c.boxScore <= HEADWORD_MAX_SCORE)
      .sort((a, b) => a.boxScore - b.boxScore)
      .slice(0, CANDIDATES_PER_PROBE),
  }));
}

/** Build a monotonic backbone: one best-box candidate per probe, then LIS. */
function backbone(probeResults) {
  const pts = [];
  for (const { rank, leaves } of probeResults) {
    if (leaves.length) pts.push({ rank, leaf: leaves[0].leaf });
  }
  pts.sort((a, b) => a.rank - b.rank || a.leaf - b.leaf);
  return lisByLeaf(pts);
}

/** Interpolate a leaf from an anchor list (same math as the runtime). */
function interp(anchors, rank) {
  if (!anchors.length) return null;
  let lo = 0, hi = anchors.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (anchors[mid].rank <= rank) lo = mid + 1;
    else hi = mid;
  }
  const a = anchors[Math.max(0, lo - 1)], b = anchors[Math.min(lo, anchors.length - 1)];
  if (a.rank === b.rank) return a.leaf;
  if (rank <= a.rank) return a.leaf;
  if (rank >= b.rank) return b.leaf;
  return a.leaf + ((b.leaf - a.leaf) * (rank - a.rank)) / (b.rank - a.rank);
}

/* ------------------------------------------------------------------ */

const index = JSON.parse(await readFile(INDEX, "utf8"));
const words = index.words.map((r) => r[0]); // collation-sorted headwords
const N = words.length;

// Even spread of probe ranks across the whole abjad range.
const probeRanks = [];
const step = Math.max(1, Math.floor(N / PROBE_COUNT));
for (let r = 0; r < N; r += step) probeRanks.push(r);

const sources = JSON.parse(await readFile(SOURCES, "utf8"));
const urduBooks = [];

for (const book of BOOKS) {
  console.log(`\n→ ${book.title} (${book.titleUr})`);
  const meta = await iaMeta(book.id);
  book.server = meta.server;
  book.dir = meta.dir;

  const probeResults = await probeBook(book, words, probeRanks);
  const hits = probeResults.filter((p) => p.leaves.length).length;
  console.log(`  ${hits}/${probeResults.length} words returned matches`);

  // Pass 1 — rough monotonic backbone from best-box candidates.
  const bb = backbone(probeResults);

  // Pass 2 — for each probe, keep the candidate nearest the backbone estimate
  // (alphabetically plausible), then LIS again for a dense, clean anchor set.
  const refined = [];
  for (const { rank, leaves } of probeResults) {
    if (!leaves.length) continue;
    const est = interp(bb, rank);
    const pick =
      est === null
        ? leaves[0]
        : leaves.reduce((best, c) => (Math.abs(c.leaf - est) < Math.abs(best.leaf - est) ? c : best));
    // Drop wild outliers the backbone clearly contradicts.
    if (est !== null && Math.abs(pick.leaf - est) > 0.06 * book.leafCount + 30) continue;
    refined.push({ rank, leaf: pick.leaf });
  }
  refined.sort((a, b) => a.rank - b.rank || a.leaf - b.leaf);
  const chain = lisByLeaf(refined);

  // Keep one anchor per rank, clamp to book, dedupe equal leaves.
  const anchors = [];
  let lastRank = -1, lastLeaf = -1;
  for (const p of chain) {
    if (p.rank === lastRank || p.leaf === lastLeaf) continue;
    if (p.leaf < 0 || p.leaf >= book.leafCount) continue;
    anchors.push([p.rank, p.leaf]);
    lastRank = p.rank;
    lastLeaf = p.leaf;
  }
  const gaps = anchors.slice(1).map(([, l], i) => l - anchors[i][1]);
  const maxGap = gaps.length ? Math.max(...gaps) : book.leafCount;
  console.log(`  ${anchors.length} anchors, max leaf gap ${maxGap}`);

  urduBooks.push({
    kind: "ur",
    key: book.key,
    id: book.id,
    title: book.title,
    titleUr: book.titleUr,
    author: book.author,
    year: book.year,
    server: book.server,
    dir: book.dir,
    subPrefix: book.subPrefix,
    leafCount: book.leafCount,
    wordCount: N, // rank space the anchors live in
    anchors,
  });
}

sources.urduBooks = urduBooks;
sources.updated = new Date().toISOString().slice(0, 10);
await writeFile(SOURCES, JSON.stringify(sources));
console.log(`\n✓ merged ${urduBooks.length} Urdu books into ${SOURCES.replace(ROOT + "/", "")}`);
