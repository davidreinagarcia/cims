/** @file Line icons for the shell chrome (rail, tab bar, pill, tiles) plus the seven navigation destinations. */
import type { KeyboardEvent } from "react";

const PATHS = {
  menu: "M4 7h16M4 12h16M4 17h16",
  explore: "M12 3a6 6 0 0 0-6 6c0 4.5 6 12 6 12s6-7.5 6-12a6 6 0 0 0-6-6Z M12 6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z",
  rooms: "M4 4h16v16H4Z M4 12h16M12 4v16",
  report: "M12 3 21.5 20h-19Z M12 9.5v5M12 16.5v1.5",
  bulletin: "M4 5h16v14H4Z M7 9h10M7 12h10M7 15h6",
  stories: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  bus: "M6 3h12a2 2 0 0 1 2 2v12H4V5a2 2 0 0 1 2-2Z M4 11h16 M8 14h.01M16 14h.01 M7 17v3M17 17v3",
  buzzprint: "M3 7h6l2 2h10v10H3Z M3 7v-2.5h4.5L10 7",
  route: "M12 2.5 21.5 12 12 21.5 2.5 12Z M8.5 14v-3h6 M12.5 8.5 15 11l-2.5 2.5",
  layers: "M12 4 21 9l-9 5-9-5Z M3 13l9 5 9-5",
  shield: "M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6Z M12 8v5M12 15.5v.5",
  close: "M6 6l12 12M18 6 6 18",
  left: "M15 5l-7 7 7 7",
  right: "M9 5l7 7-7 7",
  search: "M10.5 4.5a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z M15 15l5 5",
} as const;

/** Names of the shell icons. */
export type IconName = keyof typeof PATHS;

/** A 24px line icon in currentColor; decorative (aria-hidden). */
export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}

/** What the floating card / bottom sheet can show besides a map selection. */
export type ShellPanel = "explore" | "buses" | "rooms" | "report" | "bulletin" | "stories" | "route" | "buzzprint";

/** The six destinations of the rail (desktop) and the tab bar (phones), in order. */
export const NAV_ITEMS: { id: Exclude<ShellPanel, "route">; label: string; icon: IconName }[] = [
  { id: "explore", label: "Explore", icon: "explore" },
  { id: "buses", label: "Buses", icon: "bus" },
  { id: "rooms", label: "Rooms", icon: "rooms" },
  { id: "report", label: "Report", icon: "report" },
  { id: "bulletin", label: "Bulletin", icon: "bulletin" },
  { id: "stories", label: "Stories", icon: "stories" },
  { id: "buzzprint", label: "BuzzPrint", icon: "buzzprint" },
];

/** Roving focus for a row/column of nav buttons: arrows, Home and End move focus to the next item. */
export function moveFocus(event: KeyboardEvent<HTMLElement>, vertical: boolean) {
  const keys = vertical ? ["ArrowUp", "ArrowDown"] : ["ArrowLeft", "ArrowRight"];
  if (![...keys, "Home", "End"].includes(event.key)) return;
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-nav-item]"));
  const index = items.indexOf(document.activeElement as HTMLButtonElement);
  if (index < 0) return;
  event.preventDefault();
  const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
    : (index + (event.key === keys[1] ? 1 : -1) + items.length) % items.length;
  items[next].focus();
}
