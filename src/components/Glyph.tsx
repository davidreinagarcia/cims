/** @file Line glyphs on a 24px grid (survey-map style). Shape differs per category so they work without color. */
import type { CSSProperties } from "react";

const PATHS: Record<string, string> = {
  food: "M12 3 21 20H3Z M10 12v4M14 12v4",
  support: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Z M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z M12 3.5v5M12 15.5v5M3.5 12h5M15.5 12h5",
  makerspace: "M4 4h16v16H4Z M7 17 17 7",
  exercise: "M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9Z M8 12h8M8 10v4M16 10v4",
  orgs: "M5 5h14v8l-7 6-7-6Z M8 10l4 3 4-3",
  transport: "M12 3l9 9-9 9-9-9Z M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z",
  printing: "M7 9V4h10v5 M4 9h16v8H4Z M7 14h10v6H7Z M16 12h1",
  health: "M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6Z",
  issues: "M12 3 21.5 20h-19Z M12 9.5v5M12 16.5v1.5",
  free: "M5 3h12v18H5Z M5 21h14 M14 11.5a1 1 0 1 0 0 1 1 1 0 0 0 0-1Z",
  building: "M5 3h10v18H5Z M15 9h4v12h-4 M8 7h1M11 7h1M8 11h1M11 11h1M8 15h1M11 15h1",
};

/** Known glyph ids: the layer categories plus "building". */
export type GlyphId = keyof typeof PATHS | string;

/** SVG path data of a glyph on the 24px grid (falls back to the building glyph). Used by Glyph and by the map pins. */
export function glyphPath(id: GlyphId): string {
  return PATHS[id] ?? PATHS.building;
}

/** Draws a glyph in `currentColor`; set `--cat` or `color` on a parent to tint it. */
export default function Glyph({ id, size = 24, style }: { id: GlyphId; size?: number; style?: CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="miter"
      aria-hidden="true"
      style={style}
    >
      <path d={glyphPath(id)} />
    </svg>
  );
}
