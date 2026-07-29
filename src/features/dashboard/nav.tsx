import type { ComponentType, ReactNode, SVGProps } from "react";

export type DashboardNavItem = {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Marks the primary dashboard home item. */
  isHome?: boolean;
};

function Icon(props: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  const { children, ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

function DashboardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 4h7v7H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 13h7v7H4z" />
    </Icon>
  );
}

function LibraryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M5 5h4v14H5zM11 5h4v14h-4zM17 7h2v12h-2z" />
    </Icon>
  );
}

function UploadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M12 16V6" />
      <path d="M8 10l4-4 4 4" />
      <path d="M5 18h14" />
    </Icon>
  );
}

function SummaryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M6 7h12M6 12h8M6 17h10" />
    </Icon>
  );
}

function ReaderIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M5 6h14v12H5z" />
      <path d="M9 6v12" />
    </Icon>
  );
}

function SpeechIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M11 5v14" />
      <path d="M7 9v6M15 8v8M4 11v2M18 11v2" />
    </Icon>
  );
}

function TranslationIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M5 7h8M9 7c0 5-2 8-6 10" />
      <path d="M12 17l3-8 3 8M13.5 14h3" />
    </Icon>
  );
}

function OcrIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M5 8V5h3M16 5h3v3M19 16v3h-3M8 19H5v-3" />
      <path d="M9 12h6" />
    </Icon>
  );
}

function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
      <path d="M19.4 13.1a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V19a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H5a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V5a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H19a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z" />
    </Icon>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16.5 16.5L20 20" />
    </Icon>
  );
}

export function ThemeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M12 4v2M12 18v2M6.2 6.2l1.4 1.4M16.4 16.4l1.4 1.4M4 12h2M18 12h2M6.2 17.8l1.4-1.4M16.4 7.6l1.4-1.4" />
      <circle cx="12" cy="12" r="3.5" />
    </Icon>
  );
}

/**
 * Primary application navigation for the dashboard shell.
 * Non-home items are placeholders until those routes exist.
 */
export const DASHBOARD_NAV: DashboardNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: DashboardIcon, isHome: true },
  { label: "Library", href: "/dashboard/library", icon: LibraryIcon },
  { label: "Upload", href: "#upload", icon: UploadIcon },
  { label: "AI Summary", href: "#summary", icon: SummaryIcon },
  { label: "Reader", href: "#reader", icon: ReaderIcon },
  { label: "Text to Speech", href: "#tts", icon: SpeechIcon },
  { label: "Translation", href: "#translation", icon: TranslationIcon },
  { label: "OCR", href: "#ocr", icon: OcrIcon },
  { label: "Settings", href: "#settings", icon: SettingsIcon },
];
