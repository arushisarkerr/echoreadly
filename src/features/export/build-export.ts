import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import JSZip from "jszip";

import { AUDIO_BUCKET, EXPORTS_BUCKET } from "@/constants";
import { recordActivityEvent } from "@/features/history/record-event";
import { generateDocumentAudio } from "@/features/tts/generate-audio";
import { createServiceClient } from "@/lib/supabase/server";

export type ExportFormat = "txt" | "md" | "docx" | "pdf";
export type AudioExportFormat = "mp3";
export type AnyExportFormat = ExportFormat | AudioExportFormat;

export type DocumentExportRecord = {
  id: string;
  documentId: string;
  format: AnyExportFormat;
  languageCode: string;
  filename: string;
  storagePath: string | null;
  byteSize: number | null;
  createdAt: string;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function buildTxt(text: string, title: string): Promise<Uint8Array> {
  const body = `${title}\n\n${text}\n`;
  return new TextEncoder().encode(body);
}

async function buildMarkdown(text: string, title: string): Promise<Uint8Array> {
  const body = `# ${title}\n\n${text}\n`;
  return new TextEncoder().encode(body);
}

async function buildDocx(text: string, title: string): Promise<Uint8Array> {
  const paragraphs = [`${title}`, ...text.split(/\n+/).filter(Boolean)];
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs
      .map(
        (paragraph) =>
          `<w:p><w:r><w:t xml:space="preserve">${escapeXml(paragraph)}</w:t></w:r></w:p>`,
      )
      .join("")}
  </w:body>
</w:document>`;

  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.folder("_rels")?.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.folder("word")?.file("document.xml", documentXml);
  const buffer = await zip.generateAsync({ type: "uint8array" });
  return buffer;
}

async function buildPdf(text: string, title: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontSize = 11;
  const margin = 50;
  const pageWidth = 612;
  const pageHeight = 792;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = 14;

  const lines: string[] = [];
  const pushWrapped = (value: string) => {
    const words = value.split(/\s+/);
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next, fontSize) > maxWidth) {
        if (current) {
          lines.push(current);
        }
        current = word;
      } else {
        current = next;
      }
    }
    if (current) {
      lines.push(current);
    }
  };

  pushWrapped(title);
  lines.push("");
  for (const paragraph of text.split(/\n+/)) {
    pushWrapped(paragraph);
    lines.push("");
  }

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  for (const line of lines) {
    if (y < margin) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    page.drawText(line.slice(0, 2000), {
      x: margin,
      y,
      size: fontSize,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= lineHeight;
  }

  return pdf.save();
}

const MIME: Record<ExportFormat, string> = {
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
};

/**
 * Build and store a text export for original or translated content.
 */
export async function exportDocumentText(input: {
  documentId: string;
  guestId: string;
  title: string;
  text: string;
  format: ExportFormat;
  languageCode: string;
}): Promise<{ record: DocumentExportRecord; downloadUrl: string; bytes: Uint8Array }> {
  if (!input.text.trim()) {
    throw new Error("No text available to export.");
  }

  let bytes: Uint8Array;
  switch (input.format) {
    case "txt":
      bytes = await buildTxt(input.text, input.title);
      break;
    case "md":
      bytes = await buildMarkdown(input.text, input.title);
      break;
    case "docx":
      bytes = await buildDocx(input.text, input.title);
      break;
    case "pdf":
      bytes = await buildPdf(input.text, input.title);
      break;
    default:
      throw new Error("Unsupported export format.");
  }

  const safeTitle = input.title.replace(/[^\w\-]+/g, "_").slice(0, 60) || "document";
  const filename = `${safeTitle}-${input.languageCode}.${input.format}`;
  const objectKey = `${input.guestId}/${input.documentId}/${filename}`;
  const client = createServiceClient();

  let storagePath: string | null = null;
  const { error: uploadError } = await client.storage
    .from(EXPORTS_BUCKET)
    .upload(objectKey, bytes, {
      contentType: MIME[input.format],
      upsert: true,
    });

  if (uploadError) {
    const fallbackKey = `exports/${objectKey}`;
    const { error: fallbackError } = await client.storage
      .from("pdfs")
      .upload(fallbackKey, bytes, {
        contentType: MIME[input.format],
        upsert: true,
      });
    if (fallbackError) {
      // Still return downloadable bytes even if storage fails.
      storagePath = null;
    } else {
      storagePath = `pdfs/${fallbackKey}`;
    }
  } else {
    storagePath = `${EXPORTS_BUCKET}/${objectKey}`;
  }

  const { data, error } = await client
    .from("document_exports")
    .insert({
      document_id: input.documentId,
      format: input.format,
      language_code: input.languageCode,
      filename,
      storage_path: storagePath,
      byte_size: bytes.byteLength,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Unable to record export.");
  }

  await recordActivityEvent({
    guestId: input.guestId,
    documentId: input.documentId,
    eventType: "exported",
    title: `Exported ${input.format.toUpperCase()}`,
    detail: filename,
    metadata: {
      format: input.format,
      languageCode: input.languageCode,
    },
  });

  let downloadUrl = "";
  if (storagePath) {
    const bucket = storagePath.startsWith(`${EXPORTS_BUCKET}/`)
      ? EXPORTS_BUCKET
      : "pdfs";
    const key = storagePath.slice(bucket.length + 1);
    const signed = await client.storage.from(bucket).createSignedUrl(key, 3600);
    downloadUrl = signed.data?.signedUrl || "";
  }

  return {
    record: {
      id: String(data.id),
      documentId: String(data.document_id),
      format: data.format as ExportFormat,
      languageCode: String(data.language_code),
      filename: String(data.filename),
      storagePath: (data.storage_path as string | null) ?? null,
      byteSize: data.byte_size == null ? null : Number(data.byte_size),
      createdAt: String(data.created_at),
    },
    downloadUrl,
    bytes,
  };
}

function toObjectKey(storagePath: string, bucket: string): string {
  return storagePath.startsWith(`${bucket}/`)
    ? storagePath.slice(bucket.length + 1)
    : storagePath;
}

async function downloadAudioBytes(storagePath: string): Promise<Uint8Array> {
  const client = createServiceClient();
  const bucket = storagePath.startsWith(`${AUDIO_BUCKET}/`)
    ? AUDIO_BUCKET
    : storagePath.startsWith("pdfs/")
      ? "pdfs"
      : AUDIO_BUCKET;
  const key = toObjectKey(storagePath, bucket);
  const { data, error } = await client.storage.from(bucket).download(key);
  if (error || !data) {
    throw new Error(error?.message || "Unable to load generated audio for export.");
  }
  return new Uint8Array(await data.arrayBuffer());
}

/**
 * Export narration audio as MP3.
 * Phase 6: AI synthesis is delegated to Phase 5 `generateDocumentAudio`
 * (Provider Layer TTS). No provider SDKs or duplicate TTS logic here.
 */
export async function exportDocumentAudio(input: {
  documentId: string;
  guestId: string;
  title: string;
  text: string;
  languageCode: string;
  voice?: string;
  translationId?: string | null;
}): Promise<{
  record: DocumentExportRecord;
  downloadUrl: string;
  bytes: Uint8Array;
}> {
  if (!input.text.trim()) {
    throw new Error("No text available to export as audio.");
  }

  // Reuse Provider Layer TTS (cache + synthesis). Do not call providers here.
  const audio = await generateDocumentAudio({
    documentId: input.documentId,
    guestId: input.guestId,
    text: input.text,
    languageCode: input.languageCode,
    voice: input.voice || "alloy",
    translationId: input.translationId ?? null,
    documentTitle: input.title,
  });

  if (audio.status !== "ready") {
    throw new Error(audio.errorMessage || "Audio generation is not ready.");
  }

  const bytes = await downloadAudioBytes(audio.storagePath);
  const safeTitle =
    input.title.replace(/[^\w\-]+/g, "_").slice(0, 60) || "document";
  const filename = `${safeTitle}-${input.languageCode}.mp3`;
  const objectKey = `${input.guestId}/${input.documentId}/${filename}`;
  const client = createServiceClient();

  let storagePath: string | null = null;
  const { error: uploadError } = await client.storage
    .from(EXPORTS_BUCKET)
    .upload(objectKey, bytes, {
      contentType: "audio/mpeg",
      upsert: true,
    });

  if (uploadError) {
    const fallbackKey = `exports/${objectKey}`;
    const { error: fallbackError } = await client.storage
      .from("pdfs")
      .upload(fallbackKey, bytes, {
        contentType: "audio/mpeg",
        upsert: true,
      });
    if (fallbackError) {
      storagePath = null;
    } else {
      storagePath = `pdfs/${fallbackKey}`;
    }
  } else {
    storagePath = `${EXPORTS_BUCKET}/${objectKey}`;
  }

  const { data, error } = await client
    .from("document_exports")
    .insert({
      document_id: input.documentId,
      format: "mp3",
      language_code: input.languageCode,
      filename,
      storage_path: storagePath,
      byte_size: bytes.byteLength,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Unable to record audio export.");
  }

  await recordActivityEvent({
    guestId: input.guestId,
    documentId: input.documentId,
    eventType: "exported",
    title: "Exported MP3",
    detail: filename,
    metadata: {
      format: "mp3",
      languageCode: input.languageCode,
      voice: audio.voice,
      audioId: audio.id,
    },
  });

  let downloadUrl = "";
  if (storagePath) {
    const bucket = storagePath.startsWith(`${EXPORTS_BUCKET}/`)
      ? EXPORTS_BUCKET
      : "pdfs";
    const key = storagePath.slice(bucket.length + 1);
    const signed = await client.storage.from(bucket).createSignedUrl(key, 3600);
    downloadUrl = signed.data?.signedUrl || "";
  }

  return {
    record: {
      id: String(data.id),
      documentId: String(data.document_id),
      format: "mp3",
      languageCode: String(data.language_code),
      filename: String(data.filename),
      storagePath: (data.storage_path as string | null) ?? null,
      byteSize: data.byte_size == null ? null : Number(data.byte_size),
      createdAt: String(data.created_at),
    },
    downloadUrl,
    bytes,
  };
}

export async function listExportsForOwner(
  guestId: string,
  limit = 20,
): Promise<DocumentExportRecord[]> {
  const client = createServiceClient();
  // Ownership lives on documents.guest_id; exports inherit via document_id.
  const { data, error } = await client
    .from("document_exports")
    .select(
      "id, document_id, format, language_code, filename, storage_path, byte_size, created_at, documents!inner(guest_id)",
    )
    .eq("documents.guest_id", guestId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || "Unable to load exports.");
  }

  return ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    id: String(row.id),
    documentId: String(row.document_id),
    format: row.format as ExportFormat,
    languageCode: String(row.language_code),
    filename: String(row.filename),
    storagePath: (row.storage_path as string | null) ?? null,
    byteSize: row.byte_size == null ? null : Number(row.byte_size),
    createdAt: String(row.created_at),
  }));
}
