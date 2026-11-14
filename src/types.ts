/** @file Shared types for places shown on the map. */
/**
 * Kinds of place the map can show. The first six are the toggleable layers of the layer panel
 * (see lib/layerCatalog.ts); "landmark", "academic", "housing" and "other" are base places that are
 * always visible.
 */
export type Category =
  | "food"
  | "support"
  | "makerspace"
  | "exercise"
  | "orgs"
  | "transport"
  | "landmark"
  | "academic"
  | "housing"
  | "other";

/** Properties of a place feature in src/data/places.json. */
export interface PlaceProperties {
  id: string;
  name: string;
  category: Category;
  /** Optional sub-type inside the category (e.g. "coffee" under food). Missing means "other". */
  subtype?: string;
  description?: string;
}
