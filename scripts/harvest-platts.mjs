/**
 * Harvest the full text of Platts' "A Dictionary of Urdu, Classical Hindi and
 * English" (1884 — public domain) from the DSAL page-view endpoint.
 *
 * DSAL serves the dictionary one printed page at a time:
 *   https://dsal.uchicago.edu/cgi-bin/app/platts_query.py?page=N   (N = 1..1254)
 *
 * We fetch each page once, politely (delay + resume), and cache the raw HTML.
 * The parser (parse-platts.mjs) turns the cache into structured JSON.
 *
 * Content © public domain (Platts 1884). Digitisation: Digital Dictionaries of
 * South Asia, University of Chicago — credited in the UI.
 *
 * Usage: node scripts/harvest-platts.mjs
 */
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, "scripts", ".cache", "platts");
const LAST_PAGE = 1254;
const DELAY_MS = 350; // be gentle to a university server
const UA = "LighthouseClasses-dictionary/1.0 (educational; public-domain text)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await mkdir(CACHE, { recursive: true });
const have = new Set(await readdir(CACHE).catch(() => []));

let fetched = 0,
  skipped = 0,
  failed = [];
for (let p = 1; p <= LAST_PAGE; p++) {
  const name = `page-${p}.html`;
  if (have.has(name)) {
    skipped++;
    continue;
  }
  const url = `https://dsal.uchicago.edu/cgi-bin/app/platts_query.py?page=${p}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    if (!html.includes("<entry>")) throw new Error("no entries in response");
    await writeFile(join(CACHE, name), html);
    fetched++;
    if (fetched % 50 === 0) console.log(`  …${p}/${LAST_PAGE} (fetched ${fetched}, skipped ${skipped})`);
    await sleep(DELAY_MS);
  } catch (e) {
    failed.push(p);
    console.log(`  ! page ${p}: ${e.message}`);
    await sleep(DELAY_MS * 3);
  }
}
console.log(`Done. fetched ${fetched}, already had ${skipped}, failed ${failed.length}${failed.length ? " → " + failed.join(",") : ""}`);
