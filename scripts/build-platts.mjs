/**
 * Parse the harvested Platts pages (scripts/.cache/platts/page-N.html) into the
 * structured dataset served by /platts.
 *
 * Source: John T. Platts, "A Dictionary of Urdu, Classical Hindi, and English"
 * (1884, public domain). Digitisation by DSAL, University of Chicago.
 *
 * Output (static, works in both build modes):
 *   public/platts/index.json     — one compact row per entry (search index)
 *   public/platts/chunks/N.json  — full entries, CHUNK_SIZE per file
 *
 * Usage: node scripts/build-platts.mjs
 */
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, "scripts", ".cache", "platts");
const OUT = join(ROOT, "public", "platts");
const CHUNK_SIZE = 300;

const SRC = {
  H: "Hindi", P: "Persian", S: "Sanskrit", A: "Arabic", T: "Turkish",
  G: "Greek", E: "English", HP: "Hindi/Persian", "Ā": "Arabic",
};

const decode = (s) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\s+/g, " ")
    .trim();

/* ------------------------------------------------------------------ */
/* Normalization for search keys                                       */
/* ------------------------------------------------------------------ */
const stripUrdu = (s) => s.replace(/[ً-ٰٕـ]/g, "").normalize("NFC");
const foldRoman = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-̣̱ͯ̇]/g, "")
    .replace(/[ʻʼʿʾ'’‘`_-]/g, "")
    .replace(/x/g, "kh")
    .replace(/v/g, "w")
    .replace(/q/g, "k")
    .replace(/\s+/g, " ")
    .trim();

/* ------------------------------------------------------------------ */
/* Parse one page's HTML into entries                                  */
/* ------------------------------------------------------------------ */
/* part-of-speech abbreviations that mark the start of a definition */
// A POS marker is an abbreviation cluster that is immediately followed by the
// definition proper (a capital letter, "=", "(", digit) — this rules out
// look-alikes buried in etymology notes such as "v.n.fr." (verbal noun from).
const POS_RE =
  /(?:^|[\s,;)\]>])((?:part\. ?adj\.|s\. ?m\. ?f\.|s\. ?[mf]\.|adj\.|adv\.|v\. ?[nti]\.|part\.|prep\.|postpos\.|conj\.|interj\.|intj\.|pron\.|num\.|particle|imperat\.)(?: ?& ?(?:s\. ?[mf]\.|adj\.|adv\.|part\.|v\. ?[nt]\.))*)(?=\s+[-A-Z(=0-9'‘]|\s*$)/;

function parsePage(html, page) {
  const out = [];
  // each entry runs from <entry> to the closing </div> of its wrapper
  for (const m of html.matchAll(/<entry>([\s\S]*?)<\/div>/g)) {
    const b = m[1];
    const hwM = b.match(/<hw>([\s\S]*?)<\/hw>/);
    if (!hwM) continue;
    const hw = hwM[1];
    const urdu = hw.match(/<pa>([\s\S]*?)<\/pa>/);
    const dev = hw.match(/<d>([\s\S]*?)<\/d>/); // devanagari headword (inside hw only)
    // all roman forms inside <hw> (Platts often lists variants: "maḥabbat, muḥabbat")
    const hwRomans = [...hw.matchAll(/<i>([\s\S]*?)<\/i>/g)].map((x) => decode(x[1]));
    if (!urdu && !hwRomans.length) continue;

    // source letter sits right after <entry>, before the <hw> tag: " H <hw>…"
    const srcLetter = (b.match(/^\s*([A-ZĀ]{1,2})\s+(?=<)/) || [])[1];

    // text after the headword: [roman variants] [etymology], POS. definition
    const tail = b.slice(hwM.index + hwM[0].length);
    const pos = tail.match(POS_RE);
    const posAt = pos ? pos.index + pos[0].indexOf(pos[1]) : -1;
    const brAt = tail.indexOf("[");
    const headEnd = [posAt, brAt].filter((x) => x >= 0).reduce((a, b2) => Math.min(a, b2), tail.length);

    // roman variants live in <i> tags before the POS / etymology bracket
    const variants = [...tail.slice(0, headEnd).matchAll(/<i>([\s\S]*?)<\/i>/g)]
      .map((x) => decode(x[1]))
      .filter((v) => /[a-zāīūṛṭḍṇśṣñʿ]/i.test(v));
    const roman = [...new Set([...hwRomans, ...variants].filter(Boolean))].join(", ");

    const etyM = tail.match(/\[([\s\S]*?)\]/);
    // Persian/Arabic entries often carry the derivation inline in parentheses
    // before the POS instead of in [brackets] — keep it as etymology too.
    let inlineEty = "";
    if (!etyM && posAt > 0) {
      const head = decode(tail.slice(0, posAt)).trim();
      const par = head.match(/\(([^)]{6,200})/);
      if (par) inlineEty = par[1].replace(/[,\s]+$/, "");
    }
    const def = decode(posAt >= 0 ? tail.slice(posAt) : tail.replace(/^[\s\S]*?\]/, "")).replace(/^[,;:.\s]+/, "").trim();

    out.push({
      u: urdu ? decode(urdu[1]) : "",
      d: dev ? decode(dev[1]) : "",
      r: roman,
      src: SRC[srcLetter] || srcLetter || "",
      ety: etyM ? decode(etyM[1]) : inlineEty,
      pos: pos ? pos[1].replace(/\s+/g, "") : "",
      def,
      pg: page,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Enrichment                                                          */
/* ------------------------------------------------------------------ */

/** Verbs/particles that mark a phrase-level sub-entry as an idiom. */
const IDIOM_RE =
  /(?:^to |karnā|honā|rakhnā|denā|lenā|ānā|jānā|bharnā|ḍālnā|khānā|lagnā|lagānā|uṭhnā|paṛnā|rahnā|māranā|mārnā|khelnā|(?:^|\s)(?:kā|kī|ke|se|men̤|par)(?:\s|$))/i;

/** Registers/usage labels Platts marks inside entries. */
const REG_MARKS = [
  ["vulg.", "common speech"], ["colloq.", "colloquial"], ["fig.", "figurative"],
  ["met.", "metaphorical"], ["prov.", "proverbial"], ["poet.", "poetical"],
  ["dialec.", "dialectal"], ["corr.", "corrupted form"], ["obs.", "obsolete"],
];

/**
 * Split a Platts definition into the main sense and its sub-entries.
 * Compounds/idioms are introduced with ":—" (semicolon-dash marks extra
 * senses of the headword itself and stays in the main definition).
 */
function splitSubs(def) {
  const parts = def.split(/:\s*—\s*/);
  const main = parts[0].trim();
  const subs = [];
  for (const raw of parts.slice(1)) {
    const m = raw.match(/^(.{2,60}?)(?:,|\s\()\s*([\s\S]+)$/);
    if (!m) continue;
    const phrase = m[1].trim();
    const body = (raw.startsWith(m[1] + " (") ? raw.slice(m[1].length).trim() : m[2]).trim();
    if (!/[a-zāīūēṛṭḍṇśṣḥġḵ]/i.test(phrase)) continue;
    const idiom = IDIOM_RE.test(phrase) || /^To\s/.test(body);
    subs.push([phrase, body.replace(/[:;,\s]+$/, ""), idiom ? 1 : 0]);
  }
  return { main, subs };
}

/** "…, q.v." cross-references inside a definition. */
function extractQv(text) {
  return [...new Set([...text.matchAll(/([^\s,;()]{2,30}),\s*q\.v\./g)].map((m) => m[1]))].slice(0, 10);
}

/** "syn. word; word" mentions. */
function extractSyn(text) {
  const out = [];
  for (const m of text.matchAll(/syn\.\s+([^)\]:;]{2,60})/g)) {
    for (const w of m[1].split(/[,;]| aur /)) {
      const t = w.trim().replace(/[.]+$/, "");
      if (t && t.length < 28) out.push(t);
    }
  }
  return [...new Set(out)].slice(0, 10);
}

/** Arabic root from "fr. حبّ" / "rt. حب" in etymology or definition. */
function extractRoot(text) {
  const m = text.match(/(?:fr|rt)\.\s*([؀-ۿ]{2,6})/);
  if (!m) return "";
  // expand shadda and space the letters: حبّ → ح ب ب
  const letters = [];
  for (const ch of m[1]) {
    if (ch === "ّ" && letters.length) letters.push(letters[letters.length - 1]);
    else if (/[ء-يٹ-ے]/.test(ch)) letters.push(ch);
  }
  return letters.join(" ");
}

/** Language forms mentioned in the etymology → origin chain + equivalents. */
const LANG_NAMES = {
  S: "Sanskrit", Prk: "Prakrit", A: "Arabic", P: "Persian", T: "Turkish",
  Zend: "Avestan", Pehl: "Pahlavi", "Old P": "Old Persian", H: "Hindi", G: "Greek",
};
function extractChain(ety) {
  const steps = [];
  for (const m of ety.matchAll(/\b(Old P|S|Prk|A|P|T|Zend|Pehl|H|G)\.\s+([؀-ۿ]+|[ऀ-ॿ]+|[a-zA-Zāīūēōṛṝṭḍṇśṣćǰẖḵġx̤z̤-]{2,24})/g)) {
    const lang = LANG_NAMES[m[1]];
    if (lang && !steps.some((s) => s[0] === lang && s[1] === m[2])) steps.push([lang, m[2]]);
  }
  return steps.slice(0, 6);
}

/* ---- Wiktionary (kaikki) cross-merge -------------------------------- */
const PROSE_START =
  /^(Borrowed|Inherited|Learned|Derived|From|Ultimately|Formed|Univerbation|Compound|Blend|Clipping|Coined|Related|Cognate|Doublet|Possibly|Perhaps|Probably|Onomatopoeic|First attested)/;

async function loadWikt() {
  const path = join(ROOT, "scripts", ".cache", "kaikki-urdu.jsonl");
  let raw;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    console.log("  (no kaikki cache — skipping Wiktionary enrichment)");
    return new Map();
  }
  const map = new Map();
  for (const line of raw.split("\n")) {
    if (!line) continue;
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    if (!e.word) continue;
    const key = stripUrdu(e.word);
    const cur = map.get(key) ?? {};
    const sounds = e.sounds ?? [];
    cur.ipa ??= (sounds.find((s) => s.ipa && s.tags?.includes("Standard")) ?? sounds.find((s) => s.ipa))?.ipa;
    cur.au ??= sounds.find((s) => s.mp3_url || s.ogg_url)?.mp3_url;
    if (!cur.ex?.length) {
      const exs = [];
      for (const s of e.senses ?? [])
        for (const x of s.examples ?? [])
          if (x.text && (x.english || x.translation)) exs.push([x.text, x.roman ?? "", x.english || x.translation]);
      if (exs.length) cur.ex = exs.slice(0, 2);
    }
    const grab = (k) => [...new Set((e[k] ?? []).map((x) => x.word).filter(Boolean))];
    for (const [k, out] of [["synonyms", "syn"], ["antonyms", "ant"], ["derived", "der"], ["related", "rel"]]) {
      const v = grab(k);
      if (v.length) cur[out] = [...new Set([...(cur[out] ?? []), ...v])].slice(0, 12);
    }
    // enough to promote unmatched Wiktionary words to entries of their own
    cur.word ??= e.word;
    cur.pos ??= e.pos;
    cur.roman ??= (e.forms ?? []).find((f) => f.tags?.includes("romanization") || f.tags?.includes("transliteration"))?.form;
    if (!cur.glosses) {
      const gl = [];
      for (const s of e.senses ?? []) if (s.glosses?.length) gl.push(s.glosses[s.glosses.length - 1]);
      if (gl.length) cur.glosses = [...new Set(gl)].slice(0, 4);
    }
    if (e.etymology_text && !cur.wety) {
      let t = e.etymology_text.trim();
      if (t.startsWith("Etymology tree")) {
        const lines = t.split("\n");
        const at = lines.findIndex((l, i) => i > 0 && PROSE_START.test(l.trim()));
        t = at === -1 ? "" : lines.slice(at).join(" ");
      }
      t = t.replace(/\s+/g, " ").trim();
      if (t) cur.wety = t.length > 420 ? t.slice(0, 417) + "…" : t;
      const att = (e.etymology_text.match(/[Ff]irst attested (?:in )?((?:c\.\s?)?\d{3,4}s?[^.]{0,40}?)(?=\s+as\s|\.|,|$)/) || [])[1];
      if (att) cur.att = att.trim();
    }
    map.set(key, cur);
  }
  return map;
}
/* ---- Sher corpus (public-domain classical poetry) -------------------- */

const POETS = {
  "mirza-ghalib": ["Mirza Ghalib", "مرزا غالب"],
  "meer-taqi-meer": ["Mir Taqi Mir", "میر تقی میر"],
  "allama-iqbal": ["Allama Iqbal", "علامہ اقبال"],
  "dagh-dehlvi": ["Dagh Dehlvi", "داغ دہلوی"],
  "akbar-allahabadi": ["Akbar Allahabadi", "اکبر الہ آبادی"],
  "altaf-hussain-hali": ["Altaf Hussain Hali", "الطاف حسین حالی"],
  "bahadur-shah-zafar": ["Bahadur Shah Zafar", "بہادر شاہ ظفر"],
  "ameer-khusrau": ["Amir Khusrau", "امیر خسرو"],
  "wali-mohammad-wali": ["Wali Dakani", "ولی دکنی"],
  "meer-anees": ["Mir Anees", "میر انیس"],
  "nazm-tabatabai": ["Nazm Tabatabai", "نظم طباطبائی"],
  "jigar-moradabadi": ["Jigar Moradabadi", "جگر مراد آبادی"],
};

/**
 * Parse the ghazal corpus into couplets and build an urdu-token index.
 * Each sher: [urduLine1, urduLine2, romanLine1, romanLine2, poetIdx].
 */
async function buildShers() {
  const base = join(ROOT, "scripts", ".cache", "urdu-ghazals");
  const poets = [];
  const shers = [];
  const tokenIndex = new Map(); // stripped urdu token → sher ids
  let dirs;
  try {
    dirs = (await readdir(base)).filter((d) => POETS[d]);
  } catch {
    console.log("  (no ghazal corpus — skipping sher enrichment)");
    return { shers, poets, tokenIndex };
  }
  for (const poet of dirs) {
    const poetIdx = poets.length;
    poets.push(POETS[poet]);
    let ghazals;
    try {
      ghazals = await readdir(join(base, poet, "ur"));
    } catch {
      continue;
    }
    for (const f of ghazals) {
      if (f.startsWith(".")) continue;
      let uLines, rLines;
      try {
        uLines = (await readFile(join(base, poet, "ur", f), "utf8")).split("\n").map((l) => l.trim()).filter(Boolean);
        rLines = (await readFile(join(base, poet, "en", f), "utf8")).split("\n").map((l) => l.trim()).filter(Boolean);
      } catch {
        continue;
      }
      if (uLines.length !== rLines.length) continue; // must be line-aligned
      for (let i = 0; i + 1 < uLines.length; i += 2) {
        const [u1, u2, r1, r2] = [uLines[i], uLines[i + 1], rLines[i], rLines[i + 1]];
        if (u1.length < 10 || u1.length > 80 || u2.length < 10 || u2.length > 80) continue;
        const id = shers.length;
        shers.push([u1, u2, r1, r2, poetIdx]);
        for (const tok of new Set(`${u1} ${u2}`.split(/[^ء-ۿ]+/).map(stripUrdu).filter((t) => t.length >= 2))) {
          const list = tokenIndex.get(tok);
          if (list) list.push(id);
          else tokenIndex.set(tok, [id]);
        }
      }
    }
  }
  return { shers, poets, tokenIndex };
}

const files = (await readdir(CACHE)).filter((f) => /^page-\d+\.html$/.test(f));
files.sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0]);
console.log(`Parsing ${files.length} pages …`);

let entries = [];
for (const f of files) {
  const page = +f.match(/\d+/)[0];
  const html = await readFile(join(CACHE, f), "utf8");
  entries.push(...parsePage(html, page));
}
// drop empties, dedupe exact repeats
const seen = new Set();
entries = entries.filter((e) => {
  if (!e.u && !e.r) return false;
  const k = `${e.u}|${e.r}|${e.def.slice(0, 40)}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});
console.log(`${entries.length} entries parsed`);

/* ---- orthographic modernization ------------------------------------- */
// The DSAL digitisation writes Urdu with Arabic/Sindhi-era codepoints:
// ي ك for ی ک, ٿ ڐ ڙ for the retroflexes ٹ ڈ ڑ, and a single ه for BOTH
// modern he's. Users read and type modern Urdu (کھوتا, not کهوتا), so fix
// the headwords at build time. The two he's are disambiguated with the
// roman transliteration: an aspirate digraph (kh, gh, ćh → "ch", ṭh → "th"
// …) after the preceding consonant means do-chashmi ھ, otherwise gol ہ.
const HE_BASE = { "ب": "b", "پ": "p", "ت": "t", "ٹ": "t", "ج": "j", "چ": "c", "د": "d", "ڈ": "d", "ڑ": "r", "ک": "k", "گ": "g" };
function modernizeUrdu(u, roman) {
  const s = u
    .normalize("NFC")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ٿ/g, "ٹ")
    .replace(/ڐ/g, "ڈ")
    .replace(/ڙ/g, "ڑ");
  const rl = (roman || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  let out = "";
  for (const ch of s) {
    if (ch !== "ه") {
      out += ch;
      continue;
    }
    const base = HE_BASE[out[out.length - 1]];
    out += base && rl.includes(base + "h") ? "ھ" : "ہ";
  }
  return out;
}
for (const e of entries) {
  if (e.u) e.u = modernizeUrdu(e.u, e.r);
}

/* ---- resolve cross-reference stubs ----------------------------------- */
// Thousands of Platts entries carry no meaning of their own — just
// "= khoṅtā, q.v." or "See s.v. gul." Inline the referenced entry's
// definition so every word shows a real meaning.
{
  const byRoman = new Map();
  for (const e of entries) {
    const key = foldRoman((e.r || "").split(",")[0]);
    if (key && !byRoman.has(key)) byRoman.set(key, e);
  }
  // the referenced word may be preceded by its Urdu/Devanagari spelling —
  // skip non-Latin tokens and capture the roman one
  const STUB_RE = /(?:^|[\s(])(?:=|i\.?q\.|corr\. of|[Ss]ee s\.v\.)\s*(?:[^\sa-zA-Z,;.]+\s+)*([a-zA-ZÀ-ɏḀ-ỿ’ʻʼ-]+)/;
  const isStub = (def) => def.length < 70 && /q\.?v\.|[Ss]ee s\.v\./.test(def);
  let resolved = 0;
  for (const e of entries) {
    if (!isStub(e.def)) continue;
    let target = null;
    const m = e.def.match(STUB_RE);
    if (m) target = byRoman.get(foldRoman(m[1]));
    // follow one more hop if the target is itself a stub
    if (target && isStub(target.def)) {
      const m2 = target.def.match(STUB_RE);
      const t2 = m2 && byRoman.get(foldRoman(m2[1]));
      if (t2 && !isStub(t2.def)) target = t2;
    }
    if (target && target !== e && !isStub(target.def)) {
      e.def = `${e.def} ${target.def}`;
      resolved++;
    }
  }
  console.log(`  cross-reference stubs resolved: ${resolved}`);
}

/* ---- merge Fallon (1879) & Shakespear (1834) -------------------------- */
// Two more public-domain DSAL dictionaries (harvested by harvest-dsal.mjs)
// widen coverage far beyond Platts. Same-word entries attach their meaning
// to the Platts entry as an extra section (e.more); new words become full
// entries of their own (bk marks the book: F / S).
async function loadDsalEntries(dict, bk) {
  const dir = join(ROOT, "scripts", ".cache", dict);
  const files = (await readdir(dir).catch(() => [])).filter((f) => /^page-\d+\.html$/.test(f));
  files.sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0]);
  const out = [];
  for (const f of files) {
    const page = +f.match(/\d+/)[0];
    const html = await readFile(join(dir, f), "utf8");
    for (const block of html.split("<hw>").slice(1)) {
      const hwEnd = block.indexOf("</hw>");
      if (hwEnd < 0) continue;
      const hw = block.slice(0, hwEnd);
      const u = decode((hw.match(/<pa>([^<]*)<\/pa>/) || [])[1] || "").trim();
      const r = decode((hw.match(/<i>([\s\S]*?)<\/i>/) || [])[1] || "")
        .replace(/[,;]\s*$/, "")
        .trim();
      // corrupt headwords (digitisation left "?" for unreadable glyphs)
      if (!u || /[?؟a-zA-Z]/.test(u)) continue;
      let def = block
        .slice(hwEnd + 5)
        .split(/<\/div>/)[0]
        .replace(/<pa>([^<]*)<\/pa>/g, "$1")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .replace(/^[\s,;.]+/, "")
        .trim();
      def = decode(def);
      if (!def || def.length < 3 || !r) continue;
      out.push({ u, r, d: "", src: "", ety: "", pos: "", def, pg: page, bk });
    }
  }
  return out;
}
const wiktEarly = await loadWikt();
{
  // Key on Urdu skeleton + first roman token so homographs land on the right
  // sense (dil=heart and dal=leaf both spell دل — keep them apart). Fall back
  // to the Urdu-only key when no romanization matches.
  const rkey = (r) => foldRoman((r || "").split(",")[0]).replace(/\s+/g, "");
  const byBoth = new Map();
  const byUrdu = new Map();
  for (const e of entries) {
    const uk = stripUrdu(e.u);
    if (!uk) continue;
    const bk = uk + "|" + rkey(e.r);
    if (!byBoth.has(bk)) byBoth.set(bk, e);
    if (!byUrdu.has(uk)) byUrdu.set(uk, e);
  }
  for (const [dict, bk, label] of [
    ["fallon", "F", "Fallon"],
    ["shakespear", "S", "Shakespear"],
  ]) {
    const src = await loadDsalEntries(dict, bk);
    let merged = 0;
    let added = 0;
    for (const e of src) {
      e.u = modernizeUrdu(e.u, e.r);
      const uk = stripUrdu(e.u);
      const host = byBoth.get(uk + "|" + rkey(e.r)) || byUrdu.get(uk);
      if (host) {
        (host.more = host.more || []).push([label, e.def.length > 900 ? e.def.slice(0, 900) + "…" : e.def]);
        merged++;
      } else {
        entries.push(e);
        byBoth.set(uk + "|" + rkey(e.r), e);
        byUrdu.set(uk, e);
        added++;
      }
    }
    console.log(`  ${dict}: ${src.length} entries parsed — ${merged} merged into existing words, ${added} new words`);
  }

  // Wiktionary (CC BY-SA) words with no classical entry become entries too —
  // this is where modern vocabulary comes from.
  let wiktAdded = 0;
  for (const [k, w] of wiktEarly) {
    if (byUrdu.has(k) || !w.word || !w.glosses?.length) continue;
    const e = {
      u: w.word,
      r: w.roman || "",
      d: "",
      src: "",
      ety: "",
      pos: "",
      def: w.glosses.join("; "),
      pg: 0,
      bk: "W",
    };
    entries.push(e);
    byUrdu.set(k, e);
    wiktAdded++;
  }
  console.log(`  wiktionary: ${wiktAdded} new modern words`);
}

/* ---- derive Devanagari where missing --------------------------------- */
// ~15k (mostly Perso-Arabic) entries have no Devanagari headword. The Platts
// romanization is explicit enough to transliterate deterministically —
// validated at ~80% exact against the 29k Hindi entries that carry both
// (misses are mostly conjunct-spelling variants, still readable).
function romanToDeva(roman) {
  let s = roman
    .normalize("NFC")
    .toLowerCase()
    .replace(/ḵẖ|k͟h/g, "\x01")
    .replace(/g̠|ġ/g, "\x02")
    .replace(/ẉ/g, "w")
    .replace(/ḥ/g, "h")
    .replace(/ʺ|ʹ/g, "")
    .normalize("NFC")
    .replace(/t̤/g, "t")
    .replace(/s̤|s̱/g, "s")
    .replace(/z̤|ẕ|ḏ/g, "z")
    .replace(/ṡ/g, "s")
    .replace(/ṉ/g, "n")
    .replace(/[ʻʼ’‘.]/g, "")
    .trim();
  if (!s || /[^a-zāīūṭḍṛṅṁñńśṣćěǒ\x01\x02 -]/.test(s)) return "";
  const C = {
    kh: "ख", gh: "घ", "ćh": "छ", jh: "झ", "ṭh": "ठ", "ḍh": "ढ", th: "थ", dh: "ध", ph: "फ", bh: "भ", "ṛh": "ढ़",
    sh: "श", "ś": "श", "ṣ": "ष", "ć": "च", "ṭ": "ट", "ḍ": "ड", "ṛ": "ड़", "ṇ": "ण",
    q: "क़", z: "ज़", "ź": "ज़", "ẓ": "ज़", "ż": "ज़", f: "फ़", "\x01": "ख़", "\x02": "ग़",
    k: "क", g: "ग", j: "ज", t: "त", d: "द", n: "न", p: "प", b: "ब", m: "म",
    y: "य", r: "र", l: "ल", v: "व", w: "व", s: "स", h: "ह", c: "च",
  };
  const V_INIT = { a: "अ", "ā": "आ", i: "इ", "ī": "ई", u: "उ", "ū": "ऊ", e: "ए", ai: "ऐ", o: "ओ", au: "औ", "ě": "ए", "ǒ": "ओ" };
  const V_SIGN = { a: "", "ā": "ा", i: "ि", "ī": "ी", u: "ु", "ū": "ू", e: "े", ai: "ै", o: "ो", au: "ौ", "ě": "े", "ǒ": "ो" };
  const CONS_KEYS = Object.keys(C).sort((a, b) => b.length - a.length);
  const VOW_KEYS = Object.keys(V_INIT).sort((a, b) => b.length - a.length);
  const vowelAt = (str, i) => VOW_KEYS.some((k) => str.startsWith(k, i));
  let out = "";
  let i = 0;
  let prevCons = false;
  while (i < s.length) {
    const ch = s[i];
    if (ch === " " || ch === "-") {
      out += " ";
      prevCons = false;
      i++;
      continue;
    }
    if (/[ṅṁñń]/.test(ch)) {
      out += "ं";
      prevCons = false;
      i++;
      continue;
    }
    const v = VOW_KEYS.find((k) => s.startsWith(k, i));
    if (v) {
      out += prevCons ? V_SIGN[v] : V_INIT[v];
      prevCons = false;
      i += v.length;
      continue;
    }
    const c = CONS_KEYS.find((k) => s.startsWith(k, i));
    if (!c) return "";
    const next = i + c.length;
    // n/m directly before a stop → anusvara (bandar → बंदर), but not
    // before liquids/glides (anwar → अनवर)
    if ((c === "n" || c === "m") && next < s.length && !vowelAt(s, next) && !/[yrlwvhn m-]/.test(s[next])) {
      out += "ं";
      prevCons = false;
      i = next;
      continue;
    }
    if (prevCons && (c === "r" || c === "y")) out += "्";
    out += C[c];
    prevCons = true;
    i = next;
  }
  return out.normalize("NFC");
}
{
  let derived = 0;
  for (const e of entries) {
    if (!e.d && e.r) {
      const t = romanToDeva(e.r.split(",")[0]);
      if (t) {
        e.d = t;
        derived++;
      }
    }
  }
  console.log(`  devanagari derived for ${derived} entries`);
}

/* ---- enrichment pass ------------------------------------------------ */
console.log("Enriching …");
const wikt = wiktEarly;
const { shers, poets, tokenIndex } = await buildShers();
console.log(`  sher corpus: ${shers.length} couplets from ${poets.length} poets`);

// in-corpus frequency: how often each folded roman token appears across defs
// Diacritic-SENSITIVE token counts: pānī (water) and pāṇi (hand) must not
// pool their frequencies — search ranking breaks ties with these buckets.
const exactTok = (s) => s.normalize("NFC").toLowerCase();
const tokenCount = new Map();
for (const e of entries)
  for (const t of exactTok(e.def).split(/[^a-zāīūṭḍṛṅṁñńśṣćḥěǒ̤̠̱̄]+/u))
    if (t.length >= 3) tokenCount.set(t, (tokenCount.get(t) ?? 0) + 1);

let stats = { subs: 0, idioms: 0, syn: 0, wikt: 0, root: 0, chain: 0 };
for (const e of entries) {
  const { main, subs } = splitSubs(e.def);
  if (subs.length) {
    e.def = main;
    e.subs = subs;
    stats.subs += subs.length;
    stats.idioms += subs.filter((s) => s[2] === 1).length;
  }
  const syn = extractSyn(e.def + " " + (e.subs ?? []).map((s) => s[1]).join(" "));
  if (syn.length) (e.syn = syn), stats.syn++;
  const qv = extractQv(e.def);
  if (qv.length) e.qv = qv;
  const reg = REG_MARKS.filter(([m]) => e.def.includes(m) || e.ety.includes(m)).map(([, label]) => label);
  if (reg.length) e.reg = reg.slice(0, 4);
  const root = extractRoot(e.ety + " " + e.def.slice(0, 160));
  if (root.length >= 3) (e.root = root), stats.root++;
  const chain = extractChain(e.ety);
  if (chain.length) (e.chain = chain), stats.chain++;
  // frequency bucket from in-corpus occurrences of the first roman token
  const tok = exactTok((e.r || "").split(",")[0].trim()).split(/[\s(]/)[0];
  const c = tok && tok.length >= 3 ? tokenCount.get(tok) ?? 0 : 0;
  e.fq = c >= 40 ? 3 : c >= 12 ? 2 : c >= 4 ? 1 : 0;

  // one relevant sher: the couplet containing this headword as an exact token
  // (shortest couplet wins — snappier on the page)
  const sherIds = e.u ? tokenIndex.get(stripUrdu(e.u)) : undefined;
  if (sherIds?.length) {
    let best = sherIds[0];
    for (const id of sherIds) {
      const len = shers[id][0].length + shers[id][1].length;
      if (len < shers[best][0].length + shers[best][1].length) best = id;
    }
    e.sh = best;
    stats.sher = (stats.sher ?? 0) + 1;
  }

  const w = wikt.get(stripUrdu(e.u));
  if (w) {
    stats.wikt++;
    if (w.ipa) e.ipa = w.ipa;
    if (w.au) e.au = w.au;
    if (w.ex) e.ex = w.ex;
    if (w.syn) e.syn = [...new Set([...(e.syn ?? []), ...w.syn])].slice(0, 12);
    if (w.ant) e.ant = w.ant;
    if (w.der) e.der = w.der;
    if (w.rel) e.rel = w.rel;
    if (w.wety) e.wety = w.wety;
    if (w.att) e.att = w.att;
  }
}
console.log(
  `  ${stats.subs} sub-entries (${stats.idioms} idioms), syn on ${stats.syn}, roots ${stats.root}, chains ${stats.chain}, wikt-matched ${stats.wikt}, shers on ${stats.sher ?? 0}`
);

// Sort by roman fold (falls back to urdu) for a stable browse order
const collator = new Intl.Collator("en");
entries.sort((a, b) => collator.compare(foldRoman(a.r || a.u), foldRoman(b.r || b.u)) || a.pg - b.pg);

// index rows: [urdu, roman, devanagari, source, briefDef, chunk]
const rows = entries.map((e, i) => {
  // strip a redundant leading POS from the brief (kept as its own field on the entry)
  const d = e.pos && e.def.startsWith(e.pos) ? e.def.slice(e.pos.length).replace(/^[,.\s]+/, "") : e.def;
  const brief = d.length > 66 ? d.slice(0, 64) + "…" : d;
  return [e.u, e.r, e.d, e.src, brief, Math.floor(i / CHUNK_SIZE), e.fq ?? 0];
});

await rm(OUT, { recursive: true, force: true });
await mkdir(join(OUT, "chunks"), { recursive: true });

await writeFile(
  join(OUT, "index.json"),
  JSON.stringify({
    v: 1,
    updated: new Date().toISOString().slice(0, 10),
    source: "John T. Platts, A Dictionary of Urdu, Classical Hindi and English (1884); digitisation DSAL, Univ. of Chicago",
    count: entries.length,
    chunkCount: Math.ceil(entries.length / CHUNK_SIZE),
    rows,
  })
);

for (let c = 0; c * CHUNK_SIZE < entries.length; c++) {
  const slice = entries.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);
  await writeFile(join(OUT, "chunks", `${c}.json`), JSON.stringify(slice));
}

if (shers.length) {
  await writeFile(join(OUT, "shers.json"), JSON.stringify({ poets, shers }));
  console.log(`shers.json: ${shers.length} couplets (${((await stat(join(OUT, "shers.json"))).size / 1024).toFixed(0)} KB)`);
}

// searchable sub-entry index: [phrase, parentRow, briefDef] — lets multi-word
// compounds & idioms (dil-ārā, āb o tāb, afsar-i-aʻlā …) show up in search
const subRows = [];
entries.forEach((e, i) => {
  for (const s of e.subs ?? []) {
    const brief = s[1].length > 66 ? s[1].slice(0, 64) + "…" : s[1];
    subRows.push([s[0], i, brief]);
  }
});
await writeFile(join(OUT, "subs.json"), JSON.stringify({ v: 1, count: subRows.length, rows: subRows }));
console.log(`subs.json: ${subRows.length} sub-entries (${((await stat(join(OUT, "subs.json"))).size / 1024).toFixed(0)} KB)`);

const idxKb = ((await stat(join(OUT, "index.json"))).size / 1024).toFixed(0);
const withDev = entries.filter((e) => e.d).length;
const withEty = entries.filter((e) => e.ety).length;
console.log(
  `Done: ${entries.length} entries → ${Math.ceil(entries.length / CHUNK_SIZE)} chunks; index ${idxKb} KB; ${withDev} with Devanagari, ${withEty} with etymology`
);
