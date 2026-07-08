/**
 * Build the Urdu dictionary data used by /dictionary.
 *
 * Source: Wiktionary's Urdu extract from kaikki.org (CC BY-SA 4.0).
 *   https://kaikki.org/dictionary/Urdu/
 *
 * Usage:
 *   node scripts/build-dictionary.mjs [path/to/kaikki-urdu.jsonl]
 *
 * Without an argument the script downloads the JSONL to scripts/.cache/
 * (kept out of git) and reuses it on later runs.
 *
 * Output (committed, served statically — works in both build modes):
 *   public/dict/index.json     — compact search index, one row per headword
 *   public/dict/chunks/N.json  — full entries, ~CHUNK_SIZE headwords per file
 */
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_URL = "https://kaikki.org/dictionary/Urdu/kaikki.org-dictionary-Urdu.jsonl";
const CACHE = join(ROOT, "scripts", ".cache", "kaikki-urdu.jsonl");
const OUT = join(ROOT, "public", "dict");
const CHUNK_SIZE = 250;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Strip Arabic harakat/diacritics so search keys are stable. */
function stripDiacritics(s) {
  return s.replace(/[ً-ْٰٕٔـ]/g, "").normalize("NFC");
}

const POS_LABELS = {
  noun: "Noun", verb: "Verb", adj: "Adjective", adv: "Adverb", pron: "Pronoun",
  postp: "Postposition", prep: "Preposition", conj: "Conjunction", intj: "Interjection",
  particle: "Particle", det: "Determiner", num: "Numeral", phrase: "Phrase",
  proverb: "Proverb", prep_phrase: "Prepositional phrase", name: "Proper noun",
  suffix: "Suffix", prefix: "Prefix", interfix: "Interfix", punct: "Punctuation",
  classifier: "Classifier", abbrev: "Abbreviation", contraction: "Contraction",
};

/** Usage/register tags worth showing as chips; everything else is noise. */
const KEEP_TAGS = new Set([
  "figurative", "figuratively", "colloquial", "literary", "archaic", "obsolete",
  "slang", "vulgar", "dialectal", "poetic", "formal", "informal", "rare",
  "transitive", "intransitive", "idiomatic", "humorous", "derogatory",
  "honorific", "dated", "uncommon", "literally", "euphemistic", "religion",
  "Islam", "Hinduism", "grammar", "law", "medicine", "music", "astronomy",
  "mathematics", "military",
]);

const PROSE_STARTERS =
  /^(Borrowed|Inherited|Learned|Derived|From|Ultimately|Formed|Univerbation|Compound|Blend|Clipping|Back-formation|Coined|Named|Related|Cognate|Doublet|Possibly|Perhaps|Probably|Onomatopoeic|Abbreviation|Short for|Calque|Semantic|Equivalent|Univerbated|First attested)/;

/** kaikki sometimes prefixes prose with a rendered "Etymology tree" block — drop it. */
function cleanEtymology(text) {
  if (!text) return undefined;
  let t = text.trim();
  if (t.startsWith("Etymology tree")) {
    const lines = t.split("\n");
    const proseAt = lines.findIndex((l, i) => i > 0 && PROSE_STARTERS.test(l.trim()));
    t = proseAt === -1 ? "" : lines.slice(proseAt).join("\n").trim();
  }
  t = t.replace(/\s+/g, " ").trim();
  return t || undefined;
}

function formWithTag(forms, tag) {
  return forms?.find((f) => f.tags?.includes(tag))?.form;
}

function firstIpa(sounds) {
  if (!sounds) return undefined;
  const std = sounds.find((s) => s.ipa && s.tags?.includes("Standard"));
  return (std ?? sounds.find((s) => s.ipa))?.ipa;
}

function firstAudio(sounds) {
  const s = sounds?.find((x) => x.mp3_url || x.ogg_url);
  return s ? s.mp3_url || s.ogg_url : undefined;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function ensureSource() {
  const arg = process.argv[2];
  if (arg) return arg;
  try {
    const s = await stat(CACHE);
    if (s.size > 1_000_000) return CACHE;
  } catch {}
  console.log(`Downloading ${SOURCE_URL} …`);
  await mkdir(dirname(CACHE), { recursive: true });
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(CACHE));
  return CACHE;
}

const sourcePath = await ensureSource();
const raw = await readFile(sourcePath, "utf8");
const lines = raw.split("\n").filter(Boolean);
console.log(`Parsing ${lines.length} entries …`);

/** headword → { w, entries: [...] } */
const words = new Map();
let senseCount = 0;

for (const line of lines) {
  let e;
  try { e = JSON.parse(line); } catch { continue; }
  if (!e.word || !e.senses?.length) continue;

  const senses = [];
  for (const s of e.senses) {
    const gloss = (s.glosses ?? []).join(" — ").trim();
    if (!gloss) continue;
    senseCount++;
    const sense = { g: gloss };
    const tags = (s.tags ?? []).filter((t) => KEEP_TAGS.has(t));
    if (tags.length) sense.t = tags;
    const ex = s.examples?.find((x) => x.text);
    if (ex) {
      sense.ex = { u: ex.text };
      if (ex.roman) sense.ex.r = ex.roman;
      const en = ex.english || ex.translation;
      if (en) sense.ex.e = en;
    }
    senses.push(sense);
  }
  if (!senses.length) continue;

  const entry = { pos: POS_LABELS[e.pos] ?? e.pos, senses };
  const canonical = formWithTag(e.forms, "canonical");
  if (canonical && canonical !== e.word) entry.c = canonical;
  const roman = formWithTag(e.forms, "romanization");
  if (roman) entry.r = roman;
  const hindi = formWithTag(e.forms, "Hindi");
  if (hindi) entry.h = hindi;
  const ipa = firstIpa(e.sounds);
  if (ipa) entry.ipa = ipa;
  const audio = firstAudio(e.sounds);
  if (audio) entry.a = audio;
  const etym = cleanEtymology(e.etymology_text);
  if (etym) entry.e = etym;
  const syns = [...new Set((e.synonyms ?? []).map((s) => s.word).filter(Boolean))];
  if (syns.length) entry.syn = syns.slice(0, 12);

  const key = e.word;
  if (!words.has(key)) words.set(key, { w: key, entries: [] });
  words.get(key).entries.push(entry);
}

/* Sort by Urdu collation so browse + chunks read like a printed lughat. */
const collator = new Intl.Collator("ur");
const sorted = [...words.values()].sort((a, b) => collator.compare(a.w, b.w));

/* Assign fixed-size chunks. */
const chunks = [];
sorted.forEach((word, i) => {
  const c = Math.floor(i / CHUNK_SIZE);
  word.chunk = c;
  (chunks[c] ??= []).push(word);
});

/*
 * Index row: [urdu, roman, hindi, posCsv, briefGloss, chunk]
 * Roman/hindi/brief may be "" to keep rows compact.
 */
const indexRows = sorted.map((word) => {
  const first = word.entries[0];
  const roman = word.entries.map((e) => e.r).find(Boolean) ?? "";
  const hindi = word.entries.map((e) => e.h).find(Boolean) ?? "";
  const pos = [...new Set(word.entries.map((e) => e.pos))].join(", ");
  const brief =
    word.entries
      .flatMap((e) => e.senses)
      .map((s) => s.g)
      .find((g) => !/^inflection of|^plural of|^oblique|^vocative|^alternative (form|spelling)/i.test(g)) ??
    first.senses[0].g;
  return [word.w, roman, hindi, pos, brief.length > 90 ? brief.slice(0, 87) + "…" : brief, word.chunk];
});

await rm(OUT, { recursive: true, force: true });
await mkdir(join(OUT, "chunks"), { recursive: true });

await writeFile(
  join(OUT, "index.json"),
  JSON.stringify({
    v: 1,
    updated: new Date().toISOString().slice(0, 10),
    source: "Wiktionary via kaikki.org (CC BY-SA 4.0)",
    count: sorted.length,
    senses: senseCount,
    chunkCount: chunks.length,
    words: indexRows,
  })
);

for (let i = 0; i < chunks.length; i++) {
  const byWord = {};
  for (const { w, entries } of chunks[i]) byWord[w] = entries;
  await writeFile(join(OUT, "chunks", `${i}.json`), JSON.stringify(byWord));
}

const indexSize = (await stat(join(OUT, "index.json"))).size;
console.log(
  `Done: ${sorted.length} headwords, ${senseCount} senses → ${chunks.length} chunks; index.json ${(indexSize / 1024).toFixed(0)} KB`
);
