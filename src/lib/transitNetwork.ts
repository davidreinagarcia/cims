/** @file The GT bus network from src/data/transit.geojson as routes with ordered stops, loaded once and shared by the map layer and the trip planner. */
import transitUrl from "../data/transit.geojson?url";

/** One physical bus stop. */
export interface TransitStop { id: string; name: string; at: [number, number] }

/** One stop in a route's served order, with the tracker's scheduled seconds to the next stop and at this stop. */
export interface RouteStop { stop: string; route_stop_id: number; to_next_s: number | null; dwell_s: number | null }

/** One bus route: official name, color, service-hours text and its stops in order (routes are loops). */
export interface TransitRoute { id: number; name: string; color: string | null; hours: string | null; stops: RouteStop[] }

/** Routes and stops of the network, plus the raw GeoJSON the map draws. */
export interface TransitNetwork { routes: TransitRoute[]; stops: Map<string, TransitStop>; geojson: GeoJSON.FeatureCollection }

let pending: Promise<TransitNetwork> | null = null;

/** Loads the network once; a failed download is forgotten so the next call tries again. */
export function loadTransitNetwork(): Promise<TransitNetwork> {
  pending ??= fetch(transitUrl)
    .then((res) => {
      if (!res.ok) throw new Error(`transit.geojson HTTP ${res.status}`);
      return res.json() as Promise<GeoJSON.FeatureCollection>;
    })
    .then(parseNetwork)
    .catch((error: unknown) => {
      pending = null;
      throw error;
    });
  return pending;
}

/** Turns the generated GeoJSON into routes and a stop index. Routes without a stop sequence are kept (drawn) but can't be planned on. */
export function parseNetwork(geojson: GeoJSON.FeatureCollection): TransitNetwork {
  const stops = new Map<string, TransitStop>();
  const routes: TransitRoute[] = [];
  for (const f of geojson.features) {
    const p = f.properties ?? {};
    if (p.kind === "stop" && f.geometry.type === "Point") stops.set(p.id, { id: p.id, name: p.name, at: f.geometry.coordinates as [number, number] });
    if (p.kind === "route") routes.push({ id: p.route_id, name: p.name, color: p.color ?? null, hours: p.service_hours ?? null, stops: Array.isArray(p.stops) ? p.stops : [] });
  }
  return { routes, stops, geojson };
}
