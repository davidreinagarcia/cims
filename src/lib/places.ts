/** @file Typed access to every curated place: seed file plus src/data/pois/*.json, drafts hidden unless ?drafts=1. */
import raw from "../data/places.json";
import type { PlaceProperties } from "../types";

/** One place as a GeoJSON point feature. */
export type PlaceFeature = GeoJSON.Feature<GeoJSON.Point, PlaceProperties>;
/** All places as a GeoJSON feature collection. */
export type PlaceCollection = GeoJSON.FeatureCollection<GeoJSON.Point, PlaceProperties>;

const poiFiles = import.meta.glob<{ default: unknown }>("../data/pois/*.json", { eager: true });

/** True when the page was opened with ?drafts=1: unverified drafts become visible (for reviewers and previews). */
export const showDrafts = typeof location !== "undefined" && new URLSearchParams(location.search).has("drafts");

const collections = [raw, ...Object.values(poiFiles).map((m) => m.default)] as unknown as PlaceCollection[];

/** The places the app shows: seed and verified records, plus drafts only with ?drafts=1. */
export const places: PlaceCollection = {
  type: "FeatureCollection",
  features: collections
    .flatMap((c) => c.features)
    .filter((f) => f.properties.status !== "draft" || showDrafts),
};
