import type { ComponentType } from "react";

import {
  IconExport,
  IconHistory,
  IconHome,
  IconImport,
  IconLibrary,
  IconListen,
  IconReader,
  IconSearch,
  IconSettings,
  IconSpark,
  type IconProps,
} from "@/components/icons/dashboard-icons";
import { ROUTES } from "@/constants";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: ComponentType<IconProps>;
};

export type DashboardNavSection = {
  id: string;
  label?: string;
  items: DashboardNavItem[];
};

export const DASHBOARD_NAV: DashboardNavSection[] = [
  {
    id: "main",
    items: [
      { href: ROUTES.dashboard, label: "Dashboard", icon: IconHome },
      { href: ROUTES.import, label: "Import", icon: IconImport },
      { href: ROUTES.library, label: "Library", icon: IconLibrary },
      { href: ROUTES.reader, label: "Reader", icon: IconReader },
      { href: ROUTES.listen, label: "Listen", icon: IconListen },
      { href: ROUTES.ai, label: "AI", icon: IconSpark },
      { href: ROUTES.export, label: "Export", icon: IconExport },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    items: [
      { href: ROUTES.history, label: "History", icon: IconHistory },
      { href: ROUTES.search, label: "Search", icon: IconSearch },
      { href: ROUTES.settings, label: "Settings", icon: IconSettings },
    ],
  },
];

export const DASHBOARD_PAGE_META: Record<
  string,
  { title: string; description: string; crumbs: string[] }
> = {
  [ROUTES.dashboard]: {
    title: "Dashboard",
    description: "Continue listening, import faster, and keep your library close.",
    crumbs: ["Home"],
  },
  [ROUTES.import]: {
    title: "Import",
    description: "Bring files, websites, and video transcripts into EchoReadly.",
    crumbs: ["Home", "Import"],
  },
  [ROUTES.library]: {
    title: "Library",
    description: "Browse, filter, and organize everything you’ve imported.",
    crumbs: ["Home", "Library"],
  },
  [ROUTES.reader]: {
    title: "Reader",
    description: "A calm reading surface with room for notes and bookmarks.",
    crumbs: ["Home", "Reader"],
  },
  [ROUTES.listen]: {
    title: "Listen",
    description: "Play natural AI audio with speed, voice, and queue controls.",
    crumbs: ["Home", "Listen"],
  },
  [ROUTES.ai]: {
    title: "AI",
    description: "Summarize, translate, ask, and rewrite with focused tools.",
    crumbs: ["Home", "AI"],
  },
  [ROUTES.export]: {
    title: "Export",
    description: "Take audio, text, summaries, and notes with you.",
    crumbs: ["Home", "Export"],
  },
  [ROUTES.history]: {
    title: "History",
    description: "A timeline of imports, reading, and listening activity.",
    crumbs: ["Home", "History"],
  },
  [ROUTES.search]: {
    title: "Search",
    description: "Find documents, notes, and sessions across your workspace.",
    crumbs: ["Home", "Search"],
  },
  [ROUTES.settings]: {
    title: "Settings",
    description: "Appearance, reading, audio, and AI preferences.",
    crumbs: ["Home", "Settings"],
  },
};
