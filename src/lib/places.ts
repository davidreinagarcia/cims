import raw from "../data/places.json";
import type { PlaceProperties } from "../types";

export type PlaceFeature = GeoJSON.Feature<GeoJSON.Point, PlaceProperties>;
export type PlaceCollection = GeoJSON.FeatureCollection<GeoJSON.Point, PlaceProperties>;

export const places = raw as unknown as PlaceCollection;
