/**
 * Production probe for PDFium + koffi (does not extract document text).
 *
 *   npm run check:pdfium
 */

import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);

function candidates() {
  const root = join(process.cwd(), "node_modules", "pdfium-native");
  const fileName =
    process.platform === "darwin"
      ? "libpdfium.dylib"
      : process.platform === "win32"
        ? "pdfium.dll"
        : "libpdfium.so";

  return [
    join(root, "build", "Release", fileName),
    join(root, "build", "release", fileName),
    join(root, "release", fileName),
    join(root, "prebuilds", `${process.platform}-${process.arch}`, fileName),
  ];
}

function main() {
  if (process.env.NEXT_RUNTIME === "edge") {
    console.error("FAIL: Edge runtime cannot load PDFium/koffi.");
    process.exit(1);
  }

  const tried = candidates();
  const found = tried.find((path) => existsSync(path));

  if (!found) {
    console.error("FAIL: PDFium shared library not found.");
    console.error("Tried:\n" + tried.map((p) => `  - ${p}`).join("\n"));
    console.error(
      "Fix: rm -rf node_modules/pdfium-native && npm install\n" +
        "Host: long-lived Node.js (not Vercel Edge).",
    );
    process.exit(1);
  }

  console.log(`OK: library present at ${found}`);

  try {
    const koffi = require("koffi");
    const lib = koffi.load(found);
    const init = lib.func("void FPDF_InitLibrary()");
    init();
    console.log("OK: koffi loaded PDFium and FPDF_InitLibrary() succeeded.");
    process.exit(0);
  } catch (error) {
    console.error("FAIL: koffi could not load PDFium.");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
