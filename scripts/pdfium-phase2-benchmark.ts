/**
 * Before/after benchmark for PDFium Phase 1 vs Phase 2 geometry spacing.
 *
 * Usage:
 *   npx tsx scripts/pdfium-phase2-benchmark.ts
 *
 * Exit code 0 only when all success criteria pass.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import {
  extractPagesWithPdfium,
  resolvePdfiumGeometryOptions,
} from "../src/lib/pdf";

const ROOT = join(import.meta.dirname, "..");
const CORPUS = join(ROOT, "fixtures/pdfium-golden");
const PDF_DIR = join(CORPUS, "pdfs");
const OUT_DIR = join(CORPUS, "benchmark-out");
mkdirSync(OUT_DIR, { recursive: true });

type ExpectationsFile = {
  thresholdDefault: number;
  files: Record<
    string,
    {
      language: string;
      mustInclude: string[];
      mustNotInclude: string[];
      phrasesPhase2: string[];
      tokens: string[];
      requirePhraseImprovement?: boolean;
    }
  >;
};

const expectations = JSON.parse(
  readFileSync(join(CORPUS, "expectations.json"), "utf8"),
) as ExpectationsFile;

function embed(text: string): Map<string, number> {
  const vec = new Map<string, number>();
  for (const ch of text) {
    if (ch === " " || ch === "\n" || ch === "\r") continue;
    vec.set(ch, (vec.get(ch) || 0) + 1);
  }
  return vec;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [, v] of a) na += v * v;
  for (const [, v] of b) nb += v * v;
  for (const [k, v] of a) {
    if (b.has(k)) dot += v * (b.get(k) || 0);
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function hitRate(text: string, needles: string[]): number {
  if (needles.length === 0) return 1;
  return needles.filter((n) => text.includes(n)).length / needles.length;
}

function assertIncludes(text: string, needles: string[]): string[] {
  return needles.filter((n) => !text.includes(n));
}

function assertExcludes(text: string, needles: string[]): string[] {
  return needles.filter((n) => text.includes(n));
}

const geometry = resolvePdfiumGeometryOptions({
  spaceThreshold: expectations.thresholdDefault,
});

async function main() {
const files = readdirSync(PDF_DIR).filter((f) => f.endsWith(".pdf")).sort();
const rows = [];
let failed = false;

for (const file of files) {
  const exp = expectations.files[file];
  if (!exp) {
    console.error("Missing expectations for", file);
    failed = true;
    continue;
  }

  const bytes = new Uint8Array(readFileSync(join(PDF_DIR, file)));
  const t0 = performance.now();
  const phase1 = await extractPagesWithPdfium(bytes, { mode: "phase1" });
  const t1 = performance.now();
  const phase2 = await extractPagesWithPdfium(bytes, {
    mode: "phase2",
    geometry,
  });
  const t2 = performance.now();

  if (!phase1.ok || !phase2.ok) {
    console.error("Extract failed", file, phase1, phase2);
    failed = true;
    continue;
  }

  const text1 = phase1.pageTexts.join("\n\n");
  const text2 = phase2.pageTexts.join("\n\n");
  writeFileSync(join(OUT_DIR, `${file}.phase1.txt`), text1);
  writeFileSync(join(OUT_DIR, `${file}.phase2.txt`), text2);

  const unicodeOk =
    assertExcludes(text2, exp.mustNotInclude).length === 0 &&
    assertIncludes(text2, exp.mustInclude).length === 0;
  const graphemeOk = assertExcludes(text2, ["ভ ৌগ", "েগ া"]).length === 0;
  const phrase1 = hitRate(text1, exp.phrasesPhase2);
  const phrase2 = hitRate(text2, exp.phrasesPhase2);
  const token1 = hitRate(text1, exp.tokens);
  const token2 = hitRate(text2, exp.tokens);

  const emb1 = [];
  const emb2 = [];
  for (const q of exp.phrasesPhase2) {
    emb1.push(cosine(embed(q), embed(text1)));
    emb2.push(cosine(embed(q), embed(text2)));
  }
  const emb1Avg =
    emb1.reduce((a, b) => a + b, 0) / Math.max(emb1.length, 1);
  const emb2Avg =
    emb2.reduce((a, b) => a + b, 0) / Math.max(emb2.length, 1);

  const phraseImproved = phrase2 + 1e-9 >= phrase1;
  const requireImprovement = exp.requirePhraseImprovement !== false;
  const phraseSignificant =
    !requireImprovement
      ? true
      : exp.language === "en" || exp.language === "pt"
        ? phrase2 >= 0.99
        : phrase2 > phrase1 || phrase2 >= 0.5;
  const embeddingNotRegressed = emb2Avg + 0.02 >= emb1Avg;
  const tokensStable = token2 + 1e-9 >= token1 * 0.99;

  const pass =
    unicodeOk &&
    graphemeOk &&
    phraseImproved &&
    phraseSignificant &&
    embeddingNotRegressed &&
    tokensStable;

  if (!pass) failed = true;

  rows.push({
    file,
    language: exp.language,
    phase1Ms: +(t1 - t0).toFixed(2),
    phase2Ms: +(t2 - t1).toFixed(2),
    phrase1: +phrase1.toFixed(4),
    phrase2: +phrase2.toFixed(4),
    token1: +token1.toFixed(4),
    token2: +token2.toFixed(4),
    emb1Avg: +emb1Avg.toFixed(4),
    emb2Avg: +emb2Avg.toFixed(4),
    unicodeOk,
    graphemeOk,
    phraseImproved,
    phraseSignificant,
    embeddingNotRegressed,
    tokensStable,
    pass,
    phase2Prefix: text2.slice(0, 120),
    missingMustInclude: assertIncludes(text2, exp.mustInclude),
    forbiddenHits: assertExcludes(text2, exp.mustNotInclude),
  });
}

const report = {
  geometry,
  generatedAt: new Date().toISOString(),
  pass: !failed,
  rows,
};

writeFileSync(join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

if (failed) {
  console.error("\nPhase 2 benchmark FAILED — do not merge.");
  process.exit(1);
}

console.error("\nPhase 2 benchmark PASSED.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
