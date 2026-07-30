/**
 * Resolve the platform PDFium shared library shipped by `pdfium-native`.
 * We use the binary only — not pdfium-native's `getText()` API.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

import { assertServerRuntime } from "@/utils/server";

export type PdfiumLibraryProbe =
  | { ok: true; path: string }
  | { ok: false; error: string; tried: string[] };

function releaseCandidates(): string[] {
  const root = join(
    /*turbopackIgnore: true*/ process.cwd(),
    "node_modules",
    "pdfium-native",
  );

  const fileName =
    process.platform === "darwin"
      ? "libpdfium.dylib"
      : process.platform === "win32"
        ? "pdfium.dll"
        : "libpdfium.so";

  // Known pdfium-native layouts across versions / install modes.
  return [
    join(root, "build", "Release", fileName),
    join(root, "build", "release", fileName),
    join(root, "release", fileName),
    join(root, "prebuilds", `${process.platform}-${process.arch}`, fileName),
  ];
}

/**
 * Probe for the PDFium shared library without loading it via koffi.
 */
export function probePdfiumLibrary(): PdfiumLibraryProbe {
  assertServerRuntime("PDFium library probe");

  if (process.env.NEXT_RUNTIME === "edge") {
    return {
      ok: false,
      error:
        "PDFium requires the Node.js runtime. The Edge runtime cannot load native libraries (koffi / libpdfium).",
      tried: [],
    };
  }

  const tried = releaseCandidates();
  for (const candidate of tried) {
    if (existsSync(candidate)) {
      return { ok: true, path: candidate };
    }
  }

  return {
    ok: false,
    error: [
      `PDFium shared library not found for ${process.platform}/${process.arch}.`,
      "Reinstall dependencies so pdfium-native can download platform binaries:",
      "  rm -rf node_modules/pdfium-native && npm install",
      "Deploy on a long-lived Node.js host (not Vercel Edge / pure serverless without native binaries).",
      `Tried: ${tried.join(", ")}`,
    ].join(" "),
    tried,
  };
}

/**
 * Resolve the absolute path to libpdfium for the current platform.
 */
export function resolvePdfiumLibraryPath(): string {
  const probe = probePdfiumLibrary();
  if (!probe.ok) {
    throw new Error(probe.error);
  }
  return probe.path;
}
