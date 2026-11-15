/** @file Location helpers for the report panel: breadcrumb parts and parsing a location from URL params. */
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

/** Builds the prefilled location from ?building=&floor=&room= (or ?lng=&lat=); null when the URL has none. */
export function locationFromParams(params: URLSearchParams): ReportLocation | null {
  const place = places.features.find((f) => f.properties.id === params.get("building"));
  if (place) {
    return {
      buildingId: place.properties.id,
      buildingName: place.properties.name,
      floor: params.get("floor")?.trim() || null,
      room: params.get("room")?.trim() || null,
      point: null,
    };
  }
  const lng = Number.parseFloat(params.get("lng") ?? "");
  const lat = Number.parseFloat(params.get("lat") ?? "");
  if (Number.isFinite(lng) && Number.isFinite(lat)) {
    return { buildingId: null, buildingName: null, floor: null, room: null, point: [lng, lat] };
  }
  return null;
}
