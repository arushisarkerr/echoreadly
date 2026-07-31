import type { DocumentFormatId } from "@/features/import/formats/registry";
import { detectDocumentFormat } from "@/features/import/formats/registry";
import { parseDocx } from "@/features/processing/parsers/docx";
import { parseEpub } from "@/features/processing/parsers/epub";
import { parseOcr } from "@/features/processing/parsers/ocr";
import { parsePdf } from "@/features/processing/parsers/pdf";
import { parseTxt } from "@/features/processing/parsers/txt";
import { parseWebsite } from "@/features/processing/parsers/website";
import { parseYoutube } from "@/features/processing/parsers/youtube";
import type {
  DocumentParseResult,
  DocumentParser,
} from "@/features/processing/parsers/types";

const PARSERS: Record<DocumentFormatId, DocumentParser> = {
  pdf: parsePdf,
  docx: parseDocx,
  epub: parseEpub,
  txt: parseTxt,
  website: parseWebsite,
  youtube: parseYoutube,
  ocr: parseOcr,
};

/**
 * Dispatch to the format-specific parser. Everything else in the pipeline is shared.
 */
export async function parseDocumentBytes(
  bytes: Uint8Array,
  filename: string,
  mimeType?: string,
  sourceFormat?: string | null,
): Promise<DocumentParseResult & { formatId: DocumentFormatId }> {
  const fromSource =
    sourceFormat && sourceFormat in PARSERS
      ? (sourceFormat as DocumentFormatId)
      : null;
  const formatId =
    fromSource ||
    detectDocumentFormat(filename, mimeType, {
      preferOcr: Boolean(sourceFormat === "ocr"),
    });

  if (!formatId) {
    throw new Error("Unsupported document format for parsing.");
  }

  const parsed = await PARSERS[formatId](bytes, filename);
  return { ...parsed, formatId };
}

export {
  parseDocx,
  parseEpub,
  parseOcr,
  parsePdf,
  parseTxt,
  parseWebsite,
  parseYoutube,
};
export type { DocumentParseResult, DocumentParser };
