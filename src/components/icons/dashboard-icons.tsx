import type { SVGProps } from "react";

import { cn } from "@/utils";

export type IconProps = SVGProps<SVGSVGElement> & {
  className?: string;
};

function IconBase({ className, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-4 shrink-0", className)}
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconHome(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </IconBase>
  );
}

export function IconImport(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 19h14" />
    </IconBase>
  );
}

export function IconLibrary(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 5h4v14H4z" />
      <path d="M10 5h4v14h-4z" />
      <path d="M16 5h4v14h-4z" />
    </IconBase>
  );
}

export function IconReader(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 5h7a3 3 0 0 1 3 3v11a2.5 2.5 0 0 0-2.5-2.5H4V5Z" />
      <path d="M20 5h-7a3 3 0 0 0-3 3v11a2.5 2.5 0 0 1 2.5-2.5H20V5Z" />
    </IconBase>
  );
}

export function IconListen(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 12v2a2 2 0 0 0 2 2h1" />
      <path d="M20 12v2a2 2 0 0 1-2 2h-1" />
      <path d="M8 8v8" />
      <path d="M12 5v14" />
      <path d="M16 9v6" />
    </IconBase>
  );
}

export function IconSpark(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3v3" />
      <path d="M12 18v3" />
      <path d="M3 12h3" />
      <path d="M18 12h3" />
      <path d="m6.5 6.5 2 2" />
      <path d="m15.5 15.5 2 2" />
      <path d="m17.5 6.5-2 2" />
      <path d="m8.5 15.5-2 2" />
      <circle cx="12" cy="12" r="3.25" />
    </IconBase>
  );
}

export function IconExport(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 15V3" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 19h14" />
    </IconBase>
  );
}

export function IconHistory(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 5v4h4" />
      <path d="M12 7v5l3 2" />
    </IconBase>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16.5 16.5 4 4" />
    </IconBase>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.2" />
      <path d="M12 18.8V21" />
      <path d="m5.6 5.6 1.6 1.6" />
      <path d="m16.8 16.8 1.6 1.6" />
      <path d="M3 12h2.2" />
      <path d="M18.8 12H21" />
      <path d="m5.6 18.4 1.6-1.6" />
      <path d="m16.8 7.2 1.6-1.6" />
    </IconBase>
  );
}

export function IconPanelLeft(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M9 4.5v15" />
    </IconBase>
  );
}

export function IconSun(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2" />
      <path d="M12 19.5v2" />
      <path d="M2.5 12h2" />
      <path d="M19.5 12h2" />
      <path d="m5 5 1.4 1.4" />
      <path d="m17.6 17.6 1.4 1.4" />
      <path d="m17.6 5 1.4-1.4" />
      <path d="m5 19 1.4-1.4" />
    </IconBase>
  );
}

export function IconMoon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20 13.5A7.5 7.5 0 1 1 10.5 4 6 6 0 0 0 20 13.5Z" />
    </IconBase>
  );
}

export function IconBell(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 17h12l-1.2-1.8a6.5 6.5 0 0 1-1.3-3.9V9a4.5 4.5 0 1 0-9 0v2.3c0 1.4-.45 2.8-1.3 3.9L6 17Z" />
      <path d="M10 17a2 2 0 0 0 4 0" />
    </IconBase>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </IconBase>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m9 6 6 6-6 6" />
    </IconBase>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 5.5v13l11-6.5L8 5.5Z" />
    </IconBase>
  );
}

export function IconPause(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 5h3v14H8z" />
      <path d="M13 5h3v14h-3z" />
    </IconBase>
  );
}

export function IconStop(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" />
    </IconBase>
  );
}

export function IconGrid(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.2" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2" />
    </IconBase>
  );
}

export function IconList(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 7h12" />
      <path d="M8 12h12" />
      <path d="M8 17h12" />
      <path d="M4 7h.01" />
      <path d="M4 12h.01" />
      <path d="M4 17h.01" />
    </IconBase>
  );
}

export function IconStar(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m12 3.5 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.8 7.2 18.4l.9-5.4-3.9-3.8 5.4-.8L12 3.5Z" />
    </IconBase>
  );
}

export function IconPin(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 4h6l1 6-3 2v7l-2-1.5L9 19v-7L6 10l3-6Z" />
    </IconBase>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </IconBase>
  );
}

export function IconClose(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </IconBase>
  );
}

export function IconFile(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 3.5h7l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-10.5A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z" />
      <path d="M14 3.5V9h5" />
    </IconBase>
  );
}

export function IconLink(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9.5 14.5 7.8 16.2a3.2 3.2 0 0 1-4.5-4.5l2.4-2.4a3.2 3.2 0 0 1 4.5 0" />
      <path d="M14.5 9.5 16.2 7.8a3.2 3.2 0 0 1 4.5 4.5l-2.4 2.4a3.2 3.2 0 0 1-4.5 0" />
      <path d="m9 15 6-6" />
    </IconBase>
  );
}

export function IconTranslate(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 5h9" />
      <path d="M8.5 5v2" />
      <path d="M6.5 17 11 7.5" />
      <path d="m9 13.5 4 3.5" />
      <path d="M14 11h6" />
      <path d="M15.5 11c.6 2.2 2 4.2 4.5 5.5" />
      <path d="M20 11c-.6 2.2-2 4.2-4.5 5.5" />
    </IconBase>
  );
}

export function IconUser(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
    </IconBase>
  );
}

export function IconCommand(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 8H6.5A2.5 2.5 0 1 1 9 5.5V16" />
      <path d="M16 16h1.5A2.5 2.5 0 1 0 15 18.5V8" />
      <path d="M8 12h8" />
    </IconBase>
  );
}
