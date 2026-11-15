/** @file Location helpers for the report panel: breadcrumb parts and resolving a prefilled location by id or URL params. */
import { loadedBuildings } from "../../lib/buildings";
import { places } from "../../lib/places";
import type { ReportLocation } from "../../lib/reports";

/** Breadcrumb parts for a location: building › floor › room, or the outdoor pin coordinates. */
export function locationParts(location: ReportLocation): string[] {
  if (!location.buildingId && location.point) {
    const [lng, lat] = location.point;
    return [`Map pin ${lat.toFixed(5)}, ${lng.toFixed(5)}`];
  }
  const parts = [location.buildingName ?? location.buildingId ?? "Unknown location"];
  if (location.floor) parts.push(`Floor ${location.floor}`);
  if (location.room) parts.push(`Room ${location.room}`);
  return parts;
}

/**
 * Builds a prefilled location for a place or building id (checks curated places first, then the OSM
 * building index, since a building card's id isn't always a place record); null when neither has it yet.
 */
export function locationForId(id: string, floor: string | null = null, room: string | null = null): ReportLocation | null {
  const place = places.features.find((f) => f.properties.id === id);
  if (place) return { buildingId: place.properties.id, buildingName: place.properties.name, floor, room, point: null };
  const building = loadedBuildings()?.byId.get(id);
  if (building) return { buildingId: id, buildingName: building.name ?? null, floor, room, point: null };
  return null;
}

/** Builds the prefilled location from ?building=&floor=&room= (or ?lng=&lat=); null when the URL has none. */
export function locationFromParams(params: URLSearchParams): ReportLocation | null {
  const location = locationForId(params.get("building") ?? "", params.get("floor")?.trim() || null, params.get("room")?.trim() || null);
  if (location) return location;
  const lng = Number.parseFloat(params.get("lng") ?? "");
  const lat = Number.parseFloat(params.get("lat") ?? "");
  if (Number.isFinite(lng) && Number.isFinite(lat)) {
    return { buildingId: null, buildingName: null, floor: null, room: null, point: [lng, lat] };
  }
  return null;
}
