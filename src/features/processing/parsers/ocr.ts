import { createWorker } from "tesseract.js";
import { extractText, getDocumentProxy, renderPageAsImage } from "unpdf";

import type { DocumentParseResult } from "@/features/processing/parsers/types";

const MAX_OCR_PDF_PAGES = 20;

function looksLikePdf(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 5) {
    return false;
  }
  return (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  );
}

async function ocrImageBytes(bytes: Uint8Array): Promise<{
  text: string;
  width: number | null;
  height: number | null;
  language: string;
}> {
  const worker = await createWorker("eng");
  try {
    const result = await worker.recognize(Buffer.from(bytes));
    const text = (result.data.text || "").trim();
    const data = result.data as {
      text?: string;
      imageWidth?: number;
      imageHeight?: number;
    };
    return {
      text,
      width: data.imageWidth ?? null,
      height: data.imageHeight ?? null,
      language: "eng",
    };
  } finally {
    await worker.terminate();
  }
}

async function ocrScannedPdf(bytes: Uint8Array): Promise<DocumentParseResult> {
  const pdf = await getDocumentProxy(bytes);
  const totalPages = Math.min(pdf.numPages || 1, MAX_OCR_PDF_PAGES);
  const pageTexts: string[] = [];
  let width: number | null = null;
  let height: number | null = null;

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    const image = await renderPageAsImage(pdf, pageNumber, {
      canvasImport: () => import("@napi-rs/canvas"),
      scale: 2,
    });
    const pageBytes = new Uint8Array(image);
    const ocr = await ocrImageBytes(pageBytes);
    if (ocr.text) {
      pageTexts.push(ocr.text);
    }
    if (width == null && ocr.width != null) {
      width = ocr.width;
      height = ocr.height;
    }
  }

  const text = pageTexts.join("\n\n").trim();
  if (!text) {
    throw new Error("OCR could not read any text from this scanned PDF.");
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return {
    text,
    pageCount: totalPages,
    title: null,
    metadata: {
      width,
      height,
      ocrLanguage: "eng",
      wordCount,
      pageCount: totalPages,
    },
  };
}

/**
 * OCR extractor — images via Tesseract; scanned PDFs render pages then OCR.
 */
export async function parseOcr(
  bytes: Uint8Array,
  filename: string,
): Promise<DocumentParseResult> {
  const lower = filename.toLowerCase();
  const isPdf =
    lower.endsWith(".pdf") ||
    lower === "application/pdf" ||
    looksLikePdf(bytes);

  if (isPdf) {
    try {
      const pdf = await getDocumentProxy(bytes);
      const extracted = await extractText(pdf, { mergePages: true });
      const text = String(extracted.text ?? "").trim();
      if (text.length >= 40) {
        const wordCount = text.split(/\s+/).filter(Boolean).length;
        return {
          text,
          pageCount:
            typeof extracted.totalPages === "number" ? extracted.totalPages : null,
          title: filename,
          metadata: {
            width: null,
            height: null,
            ocrLanguage: "pdf-text-layer",
            wordCount,
          },
        };
      }
    } catch {
      // Fall through to page-image OCR.
    }

    return ocrScannedPdf(bytes);
  }

  const ocr = await ocrImageBytes(bytes);
  if (!ocr.text) {
    throw new Error("OCR could not read any text from this image.");
  }

  const wordCount = ocr.text.split(/\s+/).filter(Boolean).length;

  return {
    text: ocr.text,
    pageCount: 1,
    title: filename,
    metadata: {
      width: ocr.width,
      height: ocr.height,
      ocrLanguage: ocr.language,
      wordCount,
    },
  };
}
