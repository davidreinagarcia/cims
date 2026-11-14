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
  | "printing"
  | "health"
  | "orgs"
  | "transport"
  | "landmark"
  | "academic"
  | "housing"
  | "other";

/**
 * Data trust level (ADR-0004). "seed": existing approximate data, shown. "draft": researched but not
 * yet checked by a person, HIDDEN unless the URL has ?drafts=1. "verified": a person opened the source.
 */
export type DataStatus = "seed" | "draft" | "verified";

/** Opening hours: per weekday, a list of ["HH:MM", "HH:MM"] open/close pairs (24h, campus local time). */
export type Hours = Partial<Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", [string, string][]>>;

/** BuzzCard (student ID) access rule for a place. */
export interface BuzzcardAccess {
  required: boolean;
  note?: string;
}

/** Properties of a place feature in src/data/places.json and src/data/pois/*.json. */
export interface PlaceProperties {
  id: string;
  name: string;
  aliases?: string[];
  category: Category;
  /** Optional sub-type inside the category (e.g. "coffee" under food). Missing means "other". */
  subtype?: string;
  description?: string;
  /** Trust level; every record must say. See DataStatus. */
  status: DataStatus;
  /** Where a person can check this record (required for draft and verified). */
  source_url?: string;
  /** Date (YYYY-MM-DD) a person confirmed the record against its source. */
  verified_at?: string;
  verified_by?: string;
  address?: string;
  url?: string;
  /** Id of the building this place is in, when known. */
  building_id?: string;
  hours?: Hours;
  buzzcard?: BuzzcardAccess;
}
