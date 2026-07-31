/**
 * Processing stage labels for progress UI (especially YouTube).
 */

export type ProcessingStage =
  | "queued"
  | "extracting_transcript"
  | "downloading_audio"
  | "speech_to_text"
  | "extracting_content"
  | "chunking"
  | "saving"
  | "generating_translation"
  | "generating_audio"
  | "ready"
  | "failed";

export function processingStageLabel(stage: string | null | undefined): string {
  switch (stage) {
    case "queued":
      return "Queued";
    case "extracting_transcript":
      return "Extracting Transcript";
    case "downloading_audio":
      return "Downloading Audio";
    case "speech_to_text":
      return "Speech To Text";
    case "extracting_content":
      return "Extracting Content";
    case "chunking":
      return "Chunking";
    case "saving":
      return "Saving";
    case "generating_translation":
      return "Generating Translation";
    case "generating_audio":
      return "Generating Audio";
    case "ready":
      return "Ready";
    case "failed":
      return "Failed";
    default:
      return stage || "Processing";
  }
}
