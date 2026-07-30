/**
 * Progressive display text extraction while JSON payloads stream in.
 * Preserves plain-text streaming for translation.
 */

export type StreamingExtractMode = "plain" | "chat" | "summary";

function unescapeJsonFragment(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function extractJsonStringField(
  partial: string,
  field: string,
): string | null {
  const pattern = new RegExp(`"${field}"\\s*:\\s*"`, "i");
  const match = pattern.exec(partial);
  if (!match || match.index == null) {
    return null;
  }

  let i = match.index + match[0].length;
  let out = "";
  while (i < partial.length) {
    const ch = partial[i];
    if (ch === "\\") {
      const next = partial[i + 1];
      if (next == null) {
        break;
      }
      out += ch + next;
      i += 2;
      continue;
    }
    if (ch === '"') {
      break;
    }
    out += ch;
    i += 1;
  }

  return unescapeJsonFragment(out);
}

function extractSummarySectionsPreview(partial: string): string | null {
  const texts: string[] = [];
  const re = /"text"\s*:\s*"/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(partial)) !== null) {
    let i = match.index + match[0].length;
    let out = "";
    while (i < partial.length) {
      const ch = partial[i];
      if (ch === "\\") {
        const next = partial[i + 1];
        if (next == null) {
          break;
        }
        out += ch + next;
        i += 2;
        continue;
      }
      if (ch === '"') {
        break;
      }
      out += ch;
      i += 1;
    }
    const text = unescapeJsonFragment(out).trim();
    if (text) {
      texts.push(text);
    }
  }

  if (texts.length === 0) {
    return null;
  }

  return texts.join("\n\n");
}

/**
 * Best-effort human-readable text from a partial model stream.
 */
export function extractStreamingDisplayText(
  partial: string,
  mode: StreamingExtractMode,
): string {
  if (!partial.trim()) {
    return "";
  }

  if (mode === "plain") {
    return partial;
  }

  if (mode === "chat") {
    return (
      extractJsonStringField(partial, "answer") ||
      extractJsonStringField(partial, "content") ||
      extractJsonStringField(partial, "text") ||
      ""
    );
  }

  return (
    extractSummarySectionsPreview(partial) ||
    extractJsonStringField(partial, "content") ||
    ""
  );
}
