/** @file The toggleable map layers (PRD F-02): id, label, color token and sub-types. Add a layer or sub-type here. */
import type { Category } from "../types";

/** A filterable sub-type inside a layer. */
export interface SubType {
  id: string;
  label: string;
}

/** One entry of the layer panel. */
export interface LayerCategory {
  /** Matches `properties.category` of the features this layer controls. */
  id: Category;
  label: string;
  /** Design token holding the layer's color (styles/tokens.css). */
  cssVar: string;
  /** Sub-types; features without a matching `subtype` fall under "Other". Only list what the data really has. */
  subtypes: SubType[];
}

/** The PRD layers plus Printing and Health (added 2026-11-14), in panel order. */
export const LAYER_CATALOG: LayerCategory[] = [
  {
    id: "food",
    label: "Food",
    cssVar: "--cat-food",
    subtypes: [
      { id: "dining-hall", label: "Dining halls" },
      { id: "restaurant", label: "Restaurants" },
      { id: "coffee", label: "Coffee" },
      { id: "cafeteria", label: "Cafeterias" },
      { id: "vending", label: "Vending" },
    ],
  },
  { id: "support", label: "Support", cssVar: "--cat-support", subtypes: [] },
  { id: "printing", label: "Printing", cssVar: "--cat-printing", subtypes: [] },
  { id: "makerspace", label: "Makerspaces", cssVar: "--cat-makerspace", subtypes: [] },
  { id: "exercise", label: "Exercise", cssVar: "--cat-exercise", subtypes: [] },
  { id: "health", label: "Health", cssVar: "--cat-health", subtypes: [] },
  { id: "orgs", label: "Orgs & Events", cssVar: "--cat-orgs", subtypes: [
    { id: "club", label: "Clubs" },
    { id: "campus-org", label: "Campus orgs" },
    { id: "community", label: "Community" },
    { id: "admin", label: "Admin" },
  ] },
  { id: "transport", label: "Transport", cssVar: "--cat-transport", subtypes: [] },
];

/** A live overlay (not made of places): toggled in the layer panel like a layer, but has no pins, counts or sub-types. */
export interface OverlayLayer {
  /** "alerts" is kept in the shared layer filters; "stories-heat" is owned by the stories store. */
  id: "alerts" | "stories-heat";
  label: string;
  hint: string;
  cssVar: string;
}

/** Live overlays shown under the place layers in the layer panel. */
export const OVERLAY_CATALOG: OverlayLayer[] = [
  { id: "alerts", label: "Police alerts", hint: "Danger zones drawn by GTPD", cssVar: "--cat-issues" },
  { id: "stories-heat", label: "Social heat map", hint: "Where stories are being posted", cssVar: "--cat-orgs" },
];

/** Resolved color of a layer (reads the design token, so the tokens stay the single source of truth). */
export function categoryColor(layer: LayerCategory, fallback = "#1C2733"): string {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(layer.cssVar).trim() || fallback;
}
