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
}

/** One live bus: where it is and which route it is running. */
export type BusFeature = GeoJSON.Feature<GeoJSON.Point, { id: string; category: "transport"; route: string }>;

/**
 * Fetches the buses currently on one of the given routes (route id to name). Throws if the tracker
 * fails or answers with something that is not a vehicle list, so callers never mistake an error for "no buses".
 */
export async function fetchBuses(routeNames: Map<number, string>, signal?: AbortSignal): Promise<BusFeature[]> {
  const res = await fetch(VEHICLES_URL, { signal });
  if (!res.ok) throw new Error(`Tracker HTTP ${res.status}`);
  const body: unknown = await res.json();
  if (!Array.isArray(body)) throw new Error("Tracker did not return a vehicle list");
  return (body as TrackerVehicle[])
    .filter((v) => v.IsOnRoute && v.Seconds <= MAX_AGE_SECONDS && routeNames.has(v.RouteID))
    .map((v) => ({
      type: "Feature",
      properties: { id: `bus-${v.VehicleID}`, category: "transport", route: routeNames.get(v.RouteID)! },
      geometry: { type: "Point", coordinates: [v.Longitude, v.Latitude] },
    }));
}
