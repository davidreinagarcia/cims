/** @file Live bus positions from the official GT tracker (bus.gatech.edu), as GeoJSON points with direction and how long each has stood still. Read-only, no key. */
import { recordMotion } from "../lib/busMotion";

/** The official tracker page: where "live tracking" links point. */
export const TRACKER_URL = "https://bus.gatech.edu/";
const VEHICLES_URL = "https://bus.gatech.edu/Services/JSONPRelay.svc/GetMapVehiclePoints";
/** A position older than this is not shown: a stale bus is worse than no bus. */
const MAX_AGE_SECONDS = 120;

interface TrackerVehicle {
  VehicleID: number;
  RouteID: number;
  Latitude: number;
  Longitude: number;
  Seconds: number;
  IsOnRoute: boolean;
  Heading?: number;
  heading?: number;
}

/** One live bus: where it is and which route it is running. */
export type BusFeature = GeoJSON.Feature<GeoJSON.Point, { id: string; category: "transport"; route: string; route_id: number; heading: number | null; still_for_ms: number; expires_at: number }>;

/** Fetches fresh buses on known routes; throws on a failed tracker or invalid vehicle list. */
export async function fetchBuses(routeNames: Map<number, string>, signal?: AbortSignal): Promise<BusFeature[]> {
  const requestedAt = Date.now();
  const res = await fetch(VEHICLES_URL, { signal });
  if (!res.ok) throw new Error(`Tracker HTTP ${res.status}`);
  const body: unknown = await res.json();
  if (!Array.isArray(body)) throw new Error("Tracker did not return a vehicle list");
  // When each position was measured (the tracker reports its age in seconds).
  const fixes = new Map<string, number>();
  const buses: BusFeature[] = (body as TrackerVehicle[])
    .filter((v) => v.IsOnRoute && Number.isFinite(v.Seconds) && v.Seconds >= 0 && v.Seconds <= MAX_AGE_SECONDS &&
      Number.isFinite(v.Latitude) && Math.abs(v.Latitude) <= 90 && Number.isFinite(v.Longitude) && Math.abs(v.Longitude) <= 180 &&
      requestedAt + (MAX_AGE_SECONDS - v.Seconds) * 1000 > Date.now() && routeNames.has(v.RouteID))
    .map((v) => (fixes.set(`bus-${v.VehicleID}`, requestedAt - v.Seconds * 1000), {
      type: "Feature",
      properties: { id: `bus-${v.VehicleID}`, category: "transport", route: routeNames.get(v.RouteID)!, route_id: v.RouteID,
        // A tracker heading of exactly 0 is how it says "unknown" (its stop list reports 0 everywhere): not north.
        heading: Number.isFinite(v.Heading ?? v.heading) && (v.Heading ?? v.heading) !== 0 ? ((v.Heading ?? v.heading)! % 360 + 360) % 360 : null,
        still_for_ms: 0, expires_at: requestedAt + (MAX_AGE_SECONDS - v.Seconds) * 1000 },
      geometry: { type: "Point", coordinates: [v.Longitude, v.Latitude] },
    }));
  // Direction: the way we saw the bus move between polls first (observed), else the tracker's own heading.
  // The tracker's stop list reports Heading 0 everywhere, so its vehicle heading isn't trusted over real movement.
  const motion = recordMotion(buses.map((b) => ({ id: b.properties.id, at: b.geometry.coordinates as [number, number], fixAt: fixes.get(b.properties.id)! })), requestedAt);
  for (const bus of buses) {
    const m = motion.get(bus.properties.id);
    if (!m) continue;
    bus.properties.still_for_ms = m.stillFor;
    bus.properties.heading = m.bearing ?? bus.properties.heading;
  }
  return buses;
}
