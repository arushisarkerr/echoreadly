/**
 * Phase 2: script-agnostic geometry spacing for PDFium characters.
 *
 * Inserts U+0020 only when:
 * 1. A PDFium-generated space existed between the pair (candidate site)
 * 2. The pair does not form a single Unicode grapheme cluster
 * 3. Normalized box gap >= configurable threshold
 *
 * No Bangla/script rules, regex, OCR, or AI repair.
 */

import {
  resolvePdfiumGeometryOptions,
  type PdfiumGeometryOptions,
} from "./pdfium-geometry-options";

const SPACE = 0x20;
const LINE_FEED = 0x0a;
const CARRIAGE_RETURN = 0x0d;

export type PdfiumCharGeometry = {
  codePoint: number;
  /** PDFium FPDFText_IsGenerated result (1 = generated). */
  generated: number;
  originX: number;
  originY: number;
  left: number;
  right: number;
  bottom: number;
  top: number;
  fontSize: number;
};

const graphemeSegmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

function isBreakOrSpace(codePoint: number): boolean {
  return (
    codePoint === SPACE ||
    codePoint === LINE_FEED ||
    codePoint === CARRIAGE_RETURN ||
    codePoint === 0x09
  );
}

/**
 * True when two code points form a single extended grapheme cluster.
 * Script-agnostic (Unicode segmentation).
 */
export function formsSingleGrapheme(a: number, b: number): boolean {
  if (a === 0 || b === 0) {
    return false;
  }
  const pair = String.fromCodePoint(a, b);
  if (!graphemeSegmenter) {
    return false;
  }
  return [...graphemeSegmenter.segment(pair)].length === 1;
}

function sameLine(
  prev: PdfiumCharGeometry,
  next: PdfiumCharGeometry,
  lineTolerance: number,
): boolean {
  const fontSize = Math.max(prev.fontSize, next.fontSize, 1);
  return Math.abs(prev.originY - next.originY) <= lineTolerance * fontSize;
}

function normalizedGap(
  prev: PdfiumCharGeometry,
  next: PdfiumCharGeometry,
): number {
  const fontSize = Math.max(prev.fontSize, next.fontSize, 1);
  let gap = next.left - prev.right;
  if (!Number.isFinite(gap)) {
    gap = next.originX - prev.originX;
  }
  return gap / fontSize;
}

type KeptChar = PdfiumCharGeometry & {
  index: number;
  hadGeneratedSpaceBefore: boolean;
};

function shouldInsertSpace(
  prev: KeptChar,
  next: KeptChar,
  options: PdfiumGeometryOptions,
): boolean {
  if (!next.hadGeneratedSpaceBefore) {
    return false;
  }
  if (isBreakOrSpace(prev.codePoint) || isBreakOrSpace(next.codePoint)) {
    return false;
  }
  if (!sameLine(prev, next, options.lineTolerance)) {
    return false;
  }
  if (formsSingleGrapheme(prev.codePoint, next.codePoint)) {
    return false;
  }
  return normalizedGap(prev, next) >= options.spaceThreshold;
}

/**
 * Phase 1 filter + Phase 2 geometry spacing at generated-space candidate sites.
 */
export function assemblePageTextWithGeometry(
  chars: PdfiumCharGeometry[],
  overrides?: Partial<PdfiumGeometryOptions>,
): string {
  const options = resolvePdfiumGeometryOptions(overrides);
  const kept: KeptChar[] = [];
  let pendingGeneratedSpace = false;

  for (let index = 0; index < chars.length; index += 1) {
    const ch = chars[index];
    if (ch.generated === 1 && ch.codePoint === SPACE) {
      pendingGeneratedSpace = true;
      continue;
    }
    if (ch.codePoint === 0) {
      continue;
    }
    kept.push({
      ...ch,
      index,
      hadGeneratedSpaceBefore: pendingGeneratedSpace,
    });
    pendingGeneratedSpace = false;
  }

  if (kept.length === 0) {
    return "";
  }

  const parts: string[] = [String.fromCodePoint(kept[0].codePoint)];

  for (let i = 1; i < kept.length; i += 1) {
    const prev = kept[i - 1];
    const next = kept[i];
    if (shouldInsertSpace(prev, next, options)) {
      parts.push(" ");
    }
    parts.push(String.fromCodePoint(next.codePoint));
  }

  return parts.join("");
}
