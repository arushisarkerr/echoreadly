import type { ComponentType, ReactNode, SVGProps } from "react";

import { ROUTES } from "@/constants";

export type DashboardNavItem = {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
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

function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
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

function AddIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

function ListenIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M11 5v14" />
      <path d="M7 9v6M15 8v8M4 11v2M18 11v2" />
    </Icon>
  );
}

function CollectionsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 7h16v12H4z" />
      <path d="M8 7V5h8v2" />
    </Icon>
  );
}

function HistoryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 12a8 8 0 1 0 2.3-5.6" />
      <path d="M4 4v4h4" />
      <path d="M12 8v4l3 2" />
    </Icon>
  );
}

function ExportIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M12 4v10" />
      <path d="M8 10l4 4 4-4" />
      <path d="M5 18h14" />
    </Icon>
  );
}

function VoiceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v3" />
    </Icon>
  );
}

function AnalyticsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 19V9M10 19V5M16 19v-7M20 19H3" />
    </Icon>
  );
}

function JobsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M4 12h16M4 17h10" />
      <path d="M18 15l2 2 2-2" />
    </Icon>
  );
}

function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3.5v2M12 18.5v2M4.9 6.5l1.4 1.4M17.7 16.1l1.4 1.4M3.5 12h2M18.5 12h2M4.9 17.5l1.4-1.4M17.7 7.9l1.4-1.4" />
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
 * Primary dashboard navigation — creative workspace IA.
 */
export const DASHBOARD_NAV: DashboardNavItem[] = [
  { label: "Home", href: ROUTES.dashboard, icon: HomeIcon, isHome: true },
  { label: "Library", href: ROUTES.library, icon: LibraryIcon },
  { label: "Add Content", href: ROUTES.addContent, icon: AddIcon },
  { label: "Listen", href: ROUTES.listen, icon: ListenIcon },
  { label: "Collections", href: ROUTES.collections, icon: CollectionsIcon },
  { label: "History", href: ROUTES.history, icon: HistoryIcon },
  { label: "Analytics", href: ROUTES.analytics, icon: AnalyticsIcon },
  { label: "Jobs", href: ROUTES.jobs, icon: JobsIcon },
  { label: "Exports", href: ROUTES.exports, icon: ExportIcon },
  { label: "Voice Library", href: ROUTES.voices, icon: VoiceIcon },
  { label: "Settings", href: ROUTES.settings, icon: SettingsIcon },
];
