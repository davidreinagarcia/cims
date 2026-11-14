/** @file Typed access to the places GeoJSON in src/data/. */
import raw from "../data/places.json";
import type { PlaceProperties } from "../types";

/** One place as a GeoJSON point feature. */
export type PlaceFeature = GeoJSON.Feature<GeoJSON.Point, PlaceProperties>;
/** All places as a GeoJSON feature collection. */
export type PlaceCollection = GeoJSON.FeatureCollection<GeoJSON.Point, PlaceProperties>;

/** The places loaded from src/data/places.json. */
export const places = raw as unknown as PlaceCollection;
