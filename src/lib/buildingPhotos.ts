/** @file Free-licensed building photos (Wikimedia Commons) keyed by building id, with the credit the card must show. */
import data from "../data/building-photos.json";

/** One building photo and its attribution. */
export type BuildingPhoto = { building_id: string; image: string; alt: string; credit: string; license: string; license_url: string; source_url: string };

const byId = new Map<string, BuildingPhoto>((data.photos as BuildingPhoto[]).map((photo) => [photo.building_id, photo]));

/** The photo for a building footprint id, if one has been sourced. */
export function buildingPhoto(buildingId: string): BuildingPhoto | undefined {
  return byId.get(buildingId);
}
