/** @file Live bus positions from the official GT tracker (bus.gatech.edu), as GeoJSON points. Read-only, no key. */

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
export type BusFeature = GeoJSON.Feature<GeoJSON.Point, { id: string; category: "transport"; route: string; route_id: number; heading: number | null; expires_at: number }>;

/** Fetches fresh buses on known routes; throws on a failed tracker or invalid vehicle list. */
export async function fetchBuses(routeNames: Map<number, string>, signal?: AbortSignal): Promise<BusFeature[]> {
  const requestedAt = Date.now();
  const res = await fetch(VEHICLES_URL, { signal });
  if (!res.ok) throw new Error(`Tracker HTTP ${res.status}`);
  const body: unknown = await res.json();
  if (!Array.isArray(body)) throw new Error("Tracker did not return a vehicle list");
  return (body as TrackerVehicle[])
    .filter((v) => v.IsOnRoute && Number.isFinite(v.Seconds) && v.Seconds >= 0 && v.Seconds <= MAX_AGE_SECONDS &&
      Number.isFinite(v.Latitude) && Math.abs(v.Latitude) <= 90 && Number.isFinite(v.Longitude) && Math.abs(v.Longitude) <= 180 &&
      requestedAt + (MAX_AGE_SECONDS - v.Seconds) * 1000 > Date.now() && routeNames.has(v.RouteID))
    .map((v) => ({
      type: "Feature",
      properties: { id: `bus-${v.VehicleID}`, category: "transport", route: routeNames.get(v.RouteID)!, route_id: v.RouteID,
        heading: Number.isFinite(v.Heading ?? v.heading) ? ((v.Heading ?? v.heading)! % 360 + 360) % 360 : null,
        expires_at: requestedAt + (MAX_AGE_SECONDS - v.Seconds) * 1000 },
      geometry: { type: "Point", coordinates: [v.Longitude, v.Latitude] },
    }));
}
