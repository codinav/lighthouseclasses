/**
 * Harvest a DSAL page-view dictionary into scripts/.cache/<dict>/.
 * Same polite, resumable approach as harvest-platts.mjs, generalized.
 *
 * Public-domain sources for the unified Lighthouse dictionary:
 *   fallon      — S. W. Fallon, "A New Hindustani-English Dictionary" (1879),
 *                 ~1,239 pages; idioms, proverbs, colloquial speech
 *   shakespear  — John Shakespear, "A Dictionary, Hindustani and English"
 *                 (1834), ~2,400+ pages
 *
 * Usage: node scripts/harvest-dsal.mjs <dict> <lastPage>
 */
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [dict, lastArg] = process.argv.slice(2);
if (!dict || !lastArg) {
  console.error("usage: node scripts/harvest-dsal.mjs <dict> <lastPage>");
  process.exit(1);
}
const LAST_PAGE = +lastArg;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, "scripts", ".cache", dict);
const DELAY_MS = 350; // be gentle to a university server
const UA = "LighthouseClasses-dictionary/1.0 (educational; public-domain text)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await mkdir(CACHE, { recursive: true });
const have = new Set(await readdir(CACHE).catch(() => []));

let fetched = 0;
let skipped = 0;
const failed = [];
for (let p = 1; p <= LAST_PAGE; p++) {
  const name = `page-${p}.html`;
  if (have.has(name)) {
    skipped++;
    continue;
  }
  const url = `https://dsal.uchicago.edu/cgi-bin/app/${dict}_query.py?page=${p}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    await writeFile(join(CACHE, name), html);
    fetched++;
    if (fetched % 100 === 0) console.log(`  ${dict}: ${fetched} fetched (page ${p})`);
  } catch (e) {
    failed.push(p);
    console.error(`  ! ${dict} page ${p}: ${e.message}`);
  }
  await sleep(DELAY_MS);
}
console.log(`${dict}: done — fetched ${fetched}, cached ${skipped}, failed ${failed.length}${failed.length ? ` (${failed.slice(0, 10).join(",")})` : ""}`);
