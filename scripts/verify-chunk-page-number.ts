/**
 * One-off verification: page_number strategy + live document_chunks inserts.
 * Run: npx tsx scripts/verify-chunk-page-number.ts
 *
 * Requires migration 20260731090000 for guest (null user_id) inserts.
 */
import { createClient } from "@supabase/supabase-js";
import { chunkParsedText } from "../src/features/processing/chunk-text";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert(url && key, "Missing Supabase env");

  const txtChunks = chunkParsedText({ text: "Hello from TXT. ".repeat(20) });
  assert(txtChunks.length >= 1, "TXT should produce chunks");
  assert(
    txtChunks.every((c) => c.pageNumber === 1),
    "Non-paginated TXT must use page_number = 1",
  );

  const youtubeLike = chunkParsedText({
    text: "Transcript line. ".repeat(40),
  });
  assert(
    youtubeLike.every((c) => c.pageNumber === 1),
    "YouTube-like stream must use page_number = 1",
  );

  const pdfChunks = chunkParsedText({
    text: "page1\n\npage2",
    pages: [
      { pageNumber: 1, text: "Alpha page one content. ".repeat(10) },
      { pageNumber: 2, text: "Beta page two content. ".repeat(10) },
    ],
  });
  assert(pdfChunks.some((c) => c.pageNumber === 1), "PDF must keep page 1");
  assert(pdfChunks.some((c) => c.pageNumber === 2), "PDF must keep page 2");
  console.log("chunk strategy ok", {
    txt: txtChunks.map((c) => c.pageNumber),
    youtube: youtubeLike.map((c) => c.pageNumber),
    pdf: pdfChunks.map((c) => ({ i: c.chunkIndex, p: c.pageNumber })),
  });

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authDoc, error: authDocError } = await client
    .from("documents")
    .select("id, user_id")
    .not("user_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (authDocError) {
    throw new Error(authDocError.message);
  }
  assert(authDoc?.user_id, "Need at least one auth-owned document for PDF-style insert");

  const { data: guestDoc, error: guestDocError } = await client
    .from("documents")
    .select("id, guest_id, source_format")
    .is("user_id", null)
    .not("guest_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (guestDocError) {
    throw new Error(guestDocError.message);
  }

  async function insertChunks(
    label: string,
    documentId: string,
    chunks: ReturnType<typeof chunkParsedText>,
    userId: string | null,
  ) {
    await client.from("document_chunks").delete().eq("document_id", documentId);

    const rows = chunks.map((chunk) => {
      const row: {
        document_id: string;
        chunk_index: number;
        page_number: number;
        text: string;
        character_count: number;
        user_id?: string;
      } = {
        document_id: documentId,
        chunk_index: chunk.chunkIndex,
        page_number: chunk.pageNumber,
        text: chunk.text,
        character_count: chunk.characterCount,
      };
      if (userId) {
        row.user_id = userId;
      }
      return row;
    });

    const { error: insertError } = await client.from("document_chunks").insert(rows);
    if (insertError) {
      throw new Error(`${label} insert failed: ${insertError.message}`);
    }

    const { data: saved, error: readError } = await client
      .from("document_chunks")
      .select("page_number, chunk_index, user_id")
      .eq("document_id", documentId)
      .order("chunk_index", { ascending: true });

    if (readError) {
      throw new Error(readError.message);
    }

    assert(saved && saved.length === rows.length, `${label} row count`);
    for (let i = 0; i < rows.length; i += 1) {
      assert(
        saved[i].page_number === rows[i].page_number,
        `${label} page_number mismatch at ${i}`,
      );
    }
    console.log(`${label} insert ok`, {
      documentId,
      pages: saved.map((r) => r.page_number),
      userIds: saved.map((r) => r.user_id),
    });
  }

  // Auth path: proves page_number for PDF (1,2) and non-paginated shapes (1).
  await insertChunks("pdf(auth)", String(authDoc.id), pdfChunks, String(authDoc.user_id));
  await insertChunks("youtube-shape(auth)", String(authDoc.id), youtubeLike, String(authDoc.user_id));
  await insertChunks("txt-shape(auth)", String(authDoc.id), txtChunks, String(authDoc.user_id));

  // Guest path requires nullable document_chunks.user_id (migration 90000).
  assert(guestDoc?.id, "Need at least one guest-owned document");
  try {
    await insertChunks("youtube(guest)", String(guestDoc.id), youtubeLike, null);

    const { data: txtGuest } = await client
      .from("documents")
      .select("id")
      .eq("source_format", "txt")
      .is("user_id", null)
      .limit(1)
      .maybeSingle();

    await insertChunks(
      "txt(guest)",
      String(txtGuest?.id ?? guestDoc.id),
      txtChunks,
      null,
    );
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    if (message.includes('null value in column "user_id"')) {
      console.error(
        "GUEST_BLOCKED: apply supabase/migrations/20260731090000_document_chunks_page_number.sql (alter user_id drop not null)",
      );
    }
    throw cause;
  }

  console.log("VERIFY_OK");
}

main().catch((error) => {
  console.error("VERIFY_FAIL", error);
  process.exit(1);
});
