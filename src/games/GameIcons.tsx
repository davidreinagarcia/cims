/** @file Line icons for the Games UI on the same 24px grid and stroke as the shell icons: modes, clock, people, trophy, back, check, pin. */
const PATHS = {
  zones: "M6 21V4 M6 5h11l-2.5 3.5L17 12H6",
  drops: "M12 3a6 6 0 0 0-6 6c0 4.5 6 12 6 12s6-7.5 6-12a6 6 0 0 0-6-6Z M12 7.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z M12 21h.01",
  clock: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z M12 8v4.5l3 1.5",
  people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5 M16 6.2a3 3 0 0 1 0 5.6 M17.5 14.3c2 .6 3 2.3 3 4.7",
  trophy: "M8 4h8v5a4 4 0 0 1-8 0Z M8 6H4.5c0 3 1.3 4.5 3.7 5 M16 6h3.5c0 3-1.3 4.5-3.7 5 M12 13v4 M8.5 20h7 M10 17h4",
  back: "M15 5l-7 7 7 7",
  check: "M5 12.5l4.5 4.5L19 7.5",
  pin: "M12 3a6 6 0 0 0-6 6c0 4.5 6 12 6 12s6-7.5 6-12a6 6 0 0 0-6-6Z M12 7.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z",
  replay: "M4 12a8 8 0 1 0 2.6-5.9 M4 4v4.5h4.5",
  exit: "M10 4H5v16h5 M14 8l4 4-4 4 M18 12H9",
  edit: "M4 20h4l10.5-10.5-4-4L4 16Z M13 7l4 4",
} as const;

/** Names of the Games icons. */
export type GameIconName = keyof typeof PATHS;

/** A line icon in currentColor; decorative (aria-hidden). */
export function GIcon({ name, size = 20 }: { name: GameIconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}
