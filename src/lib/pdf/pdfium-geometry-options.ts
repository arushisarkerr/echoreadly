/**
 * Configurable PDFium Phase-2 geometry spacing options.
 * Script-agnostic; no language-specific rules.
 */

export type PdfiumGeometryOptions = {
  /**
   * Minimum normalized horizontal gap (gap / fontSize) to insert U+0020.
   * Override with env `PDFIUM_SPACE_THRESHOLD`.
   */
  spaceThreshold: number;
  /**
   * Max |Δy| / fontSize to treat two characters as the same line.
   */
  lineTolerance: number;
};

export const DEFAULT_PDFIUM_SPACE_THRESHOLD = 0.5;
export const DEFAULT_PDFIUM_LINE_TOLERANCE = 0.5;

function parsePositiveNumber(
  value: string | undefined,
  fallback: number,
): number {
  if (value == null || value.length === 0) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

/**
 * Resolve geometry options from explicit overrides and environment.
 */
export function resolvePdfiumGeometryOptions(
  overrides?: Partial<PdfiumGeometryOptions>,
): PdfiumGeometryOptions {
  return {
    spaceThreshold:
      overrides?.spaceThreshold ??
      parsePositiveNumber(
        process.env.PDFIUM_SPACE_THRESHOLD,
        DEFAULT_PDFIUM_SPACE_THRESHOLD,
      ),
    lineTolerance:
      overrides?.lineTolerance ??
      parsePositiveNumber(
        process.env.PDFIUM_LINE_TOLERANCE,
        DEFAULT_PDFIUM_LINE_TOLERANCE,
      ),
  };
}
