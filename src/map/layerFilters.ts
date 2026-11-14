/** @file Turns the layer panel's LayerFilters into a MapLibre filter and a plain visibility check. */
import type { ExpressionSpecification } from "maplibre-gl";
import type { LayerFilters } from "./types";

/** Sub-type used for features that have none. */
export const OTHER_SUBTYPE = "other";

/** Is a feature of this category and sub-type currently shown? Categories nobody toggles are always shown. */
export function isVisible(filters: LayerFilters, category: string, subtype?: string): boolean {
  if (filters.visible[category] === false) return false;
  return !(filters.hiddenSubtypes[category] ?? []).includes(subtype ?? OTHER_SUBTYPE);
}

/**
 * MapLibre filter that keeps only visible features (reads `category` and `subtype` properties), or
 * null when nothing is hidden. Pass it to `map.setFilter`.
 */
export function buildMapFilter(filters: LayerFilters): ExpressionSpecification | null {
  const category: ExpressionSpecification = ["get", "category"];
  const subtype: ExpressionSpecification = ["coalesce", ["get", "subtype"], OTHER_SUBTYPE];
  const excludes: ExpressionSpecification[] = [];
  for (const [cat, on] of Object.entries(filters.visible)) {
    if (!on) excludes.push(["!", ["==", category, cat]]);
  }
  for (const [cat, subs] of Object.entries(filters.hiddenSubtypes)) {
    for (const sub of subs) excludes.push(["!", ["all", ["==", category, cat], ["==", subtype, sub]]]);
  }
  return excludes.length ? (["all", ...excludes] as ExpressionSpecification) : null;
}
