/** @file Line glyphs on a 24px grid (survey-map style). Pictograms (fork and knife, cup, printer…) that read without color or a legend. */
import type { CSSProperties } from "react";

const PATHS: Record<string, string> = {
  // Pictograms you can read without a legend: fork and knife, cup, info, printer, wrench, dumbbell, cross, people, bus.
  food: "M6 3v6a3 3 0 0 0 6 0V3 M9 3v6 M9 12v9 M18 21V3c-2.5 1.5-3.5 4.5-3.5 9H18",
  coffee: "M4 9h12v5a6 6 0 0 1-6 6h0a6 6 0 0 1-6-6Z M16 10.5h1.5a3 3 0 0 1 0 6H15.5 M8 3.5v2.5M12 3.5v2.5",
  "dining-hall": "M13.5 6.5a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z M2.5 3.5v5a1.5 1.5 0 0 0 3 0v-5 M4 9v11.5",
  support: "M9.5 10H12v10 M8.5 20h7 M12 4.5v1",
  makerspace: "M15 3.5a5 5 0 0 0-4.6 6.9L3.5 17.3l3.2 3.2 6.9-6.9A5 5 0 0 0 20.5 9l-3 3-3.5-3.5 3-3a5 5 0 0 0-2-2Z",
  exercise: "M2.5 12h19 M5.5 8v8 M8.5 5.5v13 M15.5 5.5v13 M18.5 8v8",
  orgs: "M9 4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z M2.5 20.5a6.5 6.5 0 0 1 13 0 M15.5 4.5a3.5 3.5 0 0 1 0 6.5 M18 14a6.5 6.5 0 0 1 3.5 6.5",
  transport: "M5 3.5h14v13.5H5Z M5 11h14 M7.5 17v3.5M16.5 17v3.5 M8 14h1M15 14h1",
  printing: "M7 9V4h10v5 M4 9h16v8H4Z M7 14h10v6H7Z M16 12h1",
  health: "M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6Z",
  issues: "M12 3 21.5 20h-19Z M12 9.5v5M12 16.5v1.5",
  free: "M5 3h12v18H5Z M5 21h14 M14 11.5a1 1 0 1 0 0 1 1 1 0 0 0 0-1Z",
  building: "M5 3h10v18H5Z M15 9h4v12h-4 M8 7h1M11 7h1M8 11h1M11 11h1M8 15h1M11 15h1",
};

/** Sub-types that get their own pictogram instead of their category's. */
export const SUBTYPE_GLYPHS: Record<string, string> = { coffee: "coffee", "dining-hall": "dining-hall" };

/** Glyph id for a place: its sub-type's pictogram when it has one, else its category's. */
export function placeGlyph(category: string, subtype?: string | null): GlyphId {
  return (subtype && SUBTYPE_GLYPHS[subtype]) || category;
}

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
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
      style={style}
    >
      <path d={glyphPath(id)} />
    </svg>
  );
}
