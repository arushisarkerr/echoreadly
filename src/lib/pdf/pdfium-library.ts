/**
 * Resolve the platform PDFium shared library shipped by `pdfium-native`.
 * We use the binary only — not pdfium-native's `getText()` API.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

import { assertServerRuntime } from "@/utils/server";

function releaseDir(): string {
  return join(
    /*turbopackIgnore: true*/ process.cwd(),
    "node_modules",
    "pdfium-native",
    "build",
    "Release",
  );
}

/**
 * Candidate paths for libpdfium across platforms / install layouts.
 */
export function resolvePdfiumLibraryPath(): string {
  assertServerRuntime("PDFium library resolution");

  const release = releaseDir();
  const byPlatform =
    process.platform === "darwin"
      ? join(release, "libpdfium.dylib")
      : process.platform === "win32"
        ? join(release, "pdfium.dll")
        : join(release, "libpdfium.so");

  if (existsSync(byPlatform)) {
    return byPlatform;
  }

  throw new Error(
    `PDFium shared library not found at ${byPlatform}. Reinstall pdfium-native so its postinstall can download platform binaries.`,
  );
}
