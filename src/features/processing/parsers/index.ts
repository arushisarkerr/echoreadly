import type { DocumentFormatId } from "@/features/import/formats/registry";
import { detectDocumentFormat } from "@/features/import/formats/registry";
import { parseDocx } from "@/features/processing/parsers/docx";
import { parseEpub } from "@/features/processing/parsers/epub";
import { parsePdf } from "@/features/processing/parsers/pdf";
import { parseTxt } from "@/features/processing/parsers/txt";
import type {
  DocumentParseResult,
  DocumentParser,
} from "@/features/processing/parsers/types";

const PARSERS: Record<DocumentFormatId, DocumentParser> = {
  pdf: parsePdf,
  docx: parseDocx,
  epub: parseEpub,
  txt: parseTxt,
};

/**
 * Dispatch to the format-specific parser. Everything else in the pipeline is shared.
 */
export async function parseDocumentBytes(
  bytes: Uint8Array,
  filename: string,
  mimeType?: string,
): Promise<DocumentParseResult & { formatId: DocumentFormatId }> {
  const formatId = detectDocumentFormat(filename, mimeType);
  if (!formatId) {
    throw new Error("Unsupported document format for parsing.");
  }

  const parsed = await PARSERS[formatId](bytes, filename);
  return { ...parsed, formatId };
}

export { parseDocx, parseEpub, parsePdf, parseTxt };
export type { DocumentParseResult, DocumentParser };
