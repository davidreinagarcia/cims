/** @file Shared types for places shown on the map. */
/** Kinds of place the map can show. */
export type Category =
  | "academic"
  | "dining"
  | "housing"
  | "recreation"
  | "landmark"
  | "other";

/** Properties of a place feature in src/data/places.json. */
export interface PlaceProperties {
  id: string;
  name: string;
  category: Category;
  description?: string;
}
