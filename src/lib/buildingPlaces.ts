/** @file Building association and location metadata shared by POI pins and detail cards. */
import type { PlaceFeature } from "./places";
import type { BuildingIndex } from "./buildings";

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
