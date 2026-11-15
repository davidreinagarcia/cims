/** @file Building association and location metadata shared by POI pins and detail cards. */
import type { PlaceFeature } from "./places";
import { loadBuildings, type BuildingIndex } from "./buildings";
import { places } from "./places";

/** Read sourced location metadata without assuming an exact point or inventing a room. */
export function locationDetails(place: PlaceFeature): { coord_precision?: string; floor_or_room?: string; building?: string } {
  return place.properties as PlaceFeature["properties"] & { coord_precision?: string; floor_or_room?: string; building?: string };
}

/** Resolve explicit footprint ids, legacy seed building ids, then exact-point containment. */
export function placeBuilding(place: PlaceFeature, index: BuildingIndex, all: PlaceFeature[]): string | undefined {
  const id = place.properties.building_id;
  if (id && index.byId.has(id)) return id;
  const parent = all.find(f => f.properties.id === id);
  const point = parent?.geometry.coordinates ?? place.geometry.coordinates;
  return index.at(point[0], point[1])?.id;
}

/**
 * The footprint (building) id a place stands for, so "Show on map" opens the same card as tapping the building (with its photo).
 * Tries the usual resolution, then the OSM element the place was sourced from (a place whose point misses the outline).
 * Places that are not a building (a lawn, a stop) return undefined: keep the place card.
 */
export async function buildingIdForPlace(placeId: string): Promise<string | undefined> {
  const place = places.features.find((f) => f.properties.id === placeId);
  if (!place) return undefined;
  const index = await loadBuildings();
  const direct = placeBuilding(place, index, places.features);
  if (direct) return direct;
  const osm = place.properties.source_url?.match(/openstreetmap\.org\/((?:way|relation)\/\d+)/)?.[1];
  return osm ? index.list.find((b) => b.osmId === osm)?.id : undefined;
}
