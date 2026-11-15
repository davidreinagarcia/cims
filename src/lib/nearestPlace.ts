/** @file Finds the curated place (building) closest to a GPS point, so location-aware forms can name where someone is. */
import { haversineMeters } from "./geolocation";
import { places } from "./places";

/** The closest curated place to a [lng, lat] point within `maxMeters`, with its distance; null when none is that close. */
export function nearestPlace(point: [number, number], maxMeters = 120): { id: string; name: string; distanceM: number } | null {
  let best: { id: string; name: string; distanceM: number } | null = null;
  for (const f of places.features) {
    if (f.properties.kind === "event") continue;
    const [lng, lat] = f.geometry.coordinates;
    const d = haversineMeters({ lng: point[0], lat: point[1] }, { lng, lat });
    if (d <= maxMeters && (!best || d < best.distanceM)) best = { id: f.properties.id, name: f.properties.name, distanceM: Math.round(d) };
  }
  return best;
}
