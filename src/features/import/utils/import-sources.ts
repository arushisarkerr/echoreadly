import type { ComponentType } from "react";

import {
  IconFile,
  IconImport,
  IconLibrary,
  IconLink,
  IconListen,
  IconSpark,
  type IconProps,
} from "@/components/icons/dashboard-icons";

export type ImportSourceId =
  | "pdf"
  | "docx"
  | "epub"
  | "txt"
  | "website"
  | "youtube"
  | "ocr";

export type ImportSource = {
  id: ImportSourceId;
  label: string;
  description: string;
  icon: ComponentType<IconProps>;
  enabled: boolean;
};

/**
 * Import sources shown on the Import page.
 * Only PDF is functional in milestone 1.
 */
export const IMPORT_SOURCES: ImportSource[] = [
  {
    id: "pdf",
    label: "PDF",
    description: "Upload PDF documents to read and listen.",
    icon: IconFile,
    enabled: true,
  },
  {
    id: "docx",
    label: "DOCX",
    description: "Import Word documents.",
    icon: IconImport,
    enabled: false,
  },
  {
    id: "epub",
    label: "EPUB",
    description: "Import ebook files.",
    icon: IconLibrary,
    enabled: false,
  },
  {
    id: "txt",
    label: "TXT",
    description: "Import plain text files.",
    icon: IconFile,
    enabled: false,
  },
  {
    id: "website",
    label: "Website URL",
    description: "Import articles from the web.",
    icon: IconLink,
    enabled: false,
  },
  {
    id: "youtube",
    label: "YouTube",
    description: "Import transcripts from videos.",
    icon: IconListen,
    enabled: false,
  },
  {
    id: "ocr",
    label: "OCR",
    description: "Extract text from scans and images.",
    icon: IconSpark,
    enabled: false,
  },
];
