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
 * Primary product navigation — Import → Library (home) → Account.
 */
export const DASHBOARD_NAV: DashboardNavItem[] = [
  { label: "Import", href: ROUTES.addContent, icon: AddIcon },
  { label: "Library", href: ROUTES.library, icon: LibraryIcon, isHome: true },
  { label: "Account", href: ROUTES.settings, icon: SettingsIcon },
];
