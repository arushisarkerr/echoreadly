/**
 * Low-level PDFium FFI bindings via koffi.
 * Does not wrap FPDFText_GetText — character APIs only.
 */

import koffi from "koffi";

import { assertServerRuntime } from "@/utils/server";

import { resolvePdfiumLibraryPath } from "./pdfium-library";

export type PdfiumPointer = null | object;

export type PdfiumApi = {
  FPDF_InitLibrary: () => void;
  FPDF_DestroyLibrary: () => void;
  FPDF_LoadMemDocument: (
    data: Uint8Array,
    size: number,
    password: null,
  ) => PdfiumPointer;
  FPDF_CloseDocument: (doc: PdfiumPointer) => void;
  FPDF_GetPageCount: (doc: PdfiumPointer) => number;
  FPDF_LoadPage: (doc: PdfiumPointer, pageIndex: number) => PdfiumPointer;
  FPDF_ClosePage: (page: PdfiumPointer) => void;
  FPDFText_LoadPage: (page: PdfiumPointer) => PdfiumPointer;
  FPDFText_ClosePage: (textPage: PdfiumPointer) => void;
  FPDFText_CountChars: (textPage: PdfiumPointer) => number;
  FPDFText_GetUnicode: (textPage: PdfiumPointer, index: number) => number;
  FPDFText_IsGenerated: (textPage: PdfiumPointer, index: number) => number;
  FPDFText_GetFontSize: (textPage: PdfiumPointer, index: number) => number;
  FPDFText_GetCharBox: (
    textPage: PdfiumPointer,
    index: number,
    left: Float64Array,
    right: Float64Array,
    bottom: Float64Array,
    top: Float64Array,
  ) => number;
  FPDFText_GetCharOrigin: (
    textPage: PdfiumPointer,
    index: number,
    x: Float64Array,
    y: Float64Array,
  ) => number;
};

let api: PdfiumApi | null = null;

function loadApi(): PdfiumApi {
  assertServerRuntime("PDFium bindings");

  if (api) {
    return api;
  }

  const lib = koffi.load(resolvePdfiumLibraryPath());

  api = {
    FPDF_InitLibrary: lib.func("void FPDF_InitLibrary()"),
    FPDF_DestroyLibrary: lib.func("void FPDF_DestroyLibrary()"),
    FPDF_LoadMemDocument: lib.func(
      "void *FPDF_LoadMemDocument(const void *data_buf, int size, const char *password)",
    ),
    FPDF_CloseDocument: lib.func("void FPDF_CloseDocument(void *document)"),
    FPDF_GetPageCount: lib.func("int FPDF_GetPageCount(void *document)"),
    FPDF_LoadPage: lib.func("void *FPDF_LoadPage(void *document, int page_index)"),
    FPDF_ClosePage: lib.func("void FPDF_ClosePage(void *page)"),
    FPDFText_LoadPage: lib.func("void *FPDFText_LoadPage(void *page)"),
    FPDFText_ClosePage: lib.func("void FPDFText_ClosePage(void *text_page)"),
    FPDFText_CountChars: lib.func("int FPDFText_CountChars(void *text_page)"),
    FPDFText_GetUnicode: lib.func(
      "uint32_t FPDFText_GetUnicode(void *text_page, int index)",
    ),
    FPDFText_IsGenerated: lib.func(
      "int FPDFText_IsGenerated(void *text_page, int index)",
    ),
    FPDFText_GetFontSize: lib.func(
      "double FPDFText_GetFontSize(void *text_page, int index)",
    ),
    FPDFText_GetCharBox: lib.func(
      "int FPDFText_GetCharBox(void *text_page, int index, _Out_ double *left, _Out_ double *right, _Out_ double *bottom, _Out_ double *top)",
    ),
    FPDFText_GetCharOrigin: lib.func(
      "int FPDFText_GetCharOrigin(void *text_page, int index, _Out_ double *x, _Out_ double *y)",
    ),
  };

  return api;
}

/**
 * PDFium is process-global and not thread-safe. Serialize all native calls.
 * Keep the library initialized for the process lifetime (avoid Init/Destroy churn).
 */
let queue: Promise<unknown> = Promise.resolve();
let libraryReady = false;

export function withPdfium<T>(fn: (native: PdfiumApi) => T): Promise<T> {
  const run = queue.then(() => {
    const native = loadApi();
    if (!libraryReady) {
      native.FPDF_InitLibrary();
      libraryReady = true;
    }
    return fn(native);
  });

  queue = run.then(
    () => undefined,
    () => undefined,
  );

  return run;
}
