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
 * The footprint (building) id a venue place stands for, so "Show on map" opens the building card with its photo
 * instead of the bare place card. Events and orgs, and places outside every footprint, return undefined (keep the place).
 */
export async function buildingIdForPlace(placeId: string): Promise<string | undefined> {
  const place = places.features.find((f) => f.properties.id === placeId);
  if (!place || place.properties.kind === "event" || place.properties.kind === "org") return undefined;
  return placeBuilding(place, await loadBuildings(), places.features);
}
