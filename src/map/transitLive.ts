/** @file Live bus positions from the official GT tracker (bus.gatech.edu), as GeoJSON points. Read-only, no key. */

import { TRANSIT_VEHICLES_URL } from "../config";
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

/** Fetch fresh, valid positions on known routes; reject tracker errors instead of inventing buses. */
export async function fetchBuses(routeNames: Map<number, string>, signal?: AbortSignal): Promise<BusFeature[]> {
  const res = await fetch(TRANSIT_VEHICLES_URL, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`Tracker HTTP ${res.status}`);
  const body: unknown = await res.json();
  if (!Array.isArray(body)) throw new Error("Tracker did not return a vehicle list");
  return (body as TrackerVehicle[])
    .filter((v) => v && v.IsOnRoute === true && Number.isFinite(v.Seconds) && v.Seconds >= 0 && v.Seconds <= MAX_AGE_SECONDS
      && Number.isFinite(v.VehicleID) && routeNames.has(v.RouteID)
      && Number.isFinite(v.Latitude) && Math.abs(v.Latitude) <= 90
      && Number.isFinite(v.Longitude) && Math.abs(v.Longitude) <= 180)
    .map((v) => ({
      type: "Feature",
      properties: { id: `bus-${v.VehicleID}`, category: "transport", route: routeNames.get(v.RouteID)! },
      geometry: { type: "Point", coordinates: [v.Longitude, v.Latitude] },
    }));
}
