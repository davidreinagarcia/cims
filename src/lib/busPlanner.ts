/** @file Bus trip planner: which GT routes take you from here to there, in the right direction, ranked by when you'd arrive. Pure functions, no fetching. */
import { haversineMeters } from "./geolocation";
import type { TransitNetwork, TransitRoute, TransitStop } from "./transitNetwork";

/** Average walking speed, meters per second. */
const WALK_MPS = 1.3;
/** Streets and paths are longer than a straight line: straight-line distance times this. */
const DETOUR = 1.3;
/** Farthest stop (straight line) we'd ask someone to walk to, at either end: about 10 minutes. */
export const MAX_WALK_TO_STOP_M = 600;
/** A bus this close to a stop counts as being at it. */
const AT_STOP_M = 60;
/** A bus waits at a stop a little: arriving up to this late still catches it. */
const CATCH_GRACE_S = 30;

/** A live bus as the planner needs it. */
export interface LiveBus { id: string; routeId: number; at: [number, number] }

/** One way to get there by bus. Times are seconds. `live` is false when no bus is running on the route right now. */
export interface BusOption {
  route: TransitRoute;
  board: TransitStop;
  alight: TransitStop;
  walkToStop: number;
  rideTime: number;
  walkFromStop: number;
  live: boolean;
  /** Seconds until the next bus you can catch reaches the boarding stop (estimated from its live position), or null with no live bus. */
  wait: number | null;
  /** Seconds until you should start walking to make that bus; 0 means now. Null with no live bus. */
  leaveIn: number | null;
  /** Door-to-door seconds from now, or null with no live bus. */
  total: number | null;
  /** Door-to-door seconds without waiting: what the trip takes once a bus is there. */
  tripTime: number;
}

/** The planner's answer: bus options (best first) and the plain walking time to compare against. */
export interface BusPlan { options: BusOption[]; walkTime: number }

type LngLat = [number, number];
const meters = (a: LngLat, b: LngLat) => haversineMeters({ lng: a[0], lat: a[1] }, { lng: b[0], lat: b[1] });

/** Estimated walking seconds between two points (straight line with a street detour factor). */
export function walkSeconds(a: LngLat, b: LngLat): number {
  return (meters(a, b) * DETOUR) / WALK_MPS;
}

/** Scheduled seconds riding from stop index `from` to `to`, going forward around the loop (waits at the stops in between included). Null if the tracker gave no time for a leg. */
export function rideSeconds(route: TransitRoute, from: number, to: number): number | null {
  const n = route.stops.length;
  let total = 0;
  for (let k = from; k !== to; ) {
    const leg = route.stops[k].to_next_s;
    if (leg == null) return null;
    total += leg;
    k = (k + 1) % n;
    if (k !== to) total += route.stops[k].dwell_s ?? 0;
  }
  return total;
}

/** Seconds for a full lap of the route, or null if a leg has no time. */
function lapSeconds(route: TransitRoute): number | null {
  let total = 0;
  for (const s of route.stops) {
    if (s.to_next_s == null) return null;
    total += s.to_next_s + (s.dwell_s ?? 0);
  }
  return total;
}

/** Seconds until a live bus reaches stop index `target`: it is placed on the leg it's driving (nearest stop and which neighbor it's between). */
export function busEtaSeconds(route: TransitRoute, stops: Map<string, TransitStop>, bus: LngLat, target: number): number | null {
  const n = route.stops.length;
  const at = (i: number) => stops.get(route.stops[(i + n) % n].stop)?.at;
  let nearest = -1;
  let best = Infinity;
  route.stops.forEach((_, i) => {
    const p = at(i);
    if (!p) return;
    const d = meters(bus, p);
    if (d < best) { best = d; nearest = i; }
  });
  if (nearest < 0) return null;
  if (best <= AT_STOP_M) return rideSeconds(route, nearest, target);
  // Between nearest and the next stop if the bus is closer to the next stop than nearest is; otherwise it's still coming to nearest.
  const next = (nearest + 1) % n;
  const nextAt = at(next);
  const nearestAt = at(nearest)!;
  const ahead = nextAt && meters(bus, nextAt) < meters(nearestAt, nextAt);
  const from = ahead ? nearest : (nearest - 1 + n) % n;
  const to = (from + 1) % n;
  const fromAt = at(from);
  const toAt = at(to);
  const leg = route.stops[from].to_next_s;
  if (!fromAt || !toAt || leg == null) return null;
  const span = meters(fromAt, toAt) || 1;
  const left = Math.min(1, meters(bus, toAt) / span) * leg;
  if (to === target) return left;
  const rest = rideSeconds(route, to, target);
  return rest == null ? null : left + (route.stops[to].dwell_s ?? 0) + rest;
}

/** Bus options from `origin` to `destination` ([lng, lat]), best first. Uses live buses for waiting time when given. */
export function planBusTrips(network: TransitNetwork, origin: LngLat, destination: LngLat, buses: LiveBus[] = []): BusPlan {
  const walkTime = walkSeconds(origin, destination);
  const options: BusOption[] = [];
  for (const route of network.routes) {
    const n = route.stops.length;
    if (n < 2) continue;
    const located = route.stops.map((s) => network.stops.get(s.stop));
    const near = (point: LngLat) => located.flatMap((stop, i) => (stop && meters(point, stop.at) <= MAX_WALK_TO_STOP_M ? [{ i, stop, walk: walkSeconds(point, stop.at) }] : []));
    const boards = near(origin);
    const alights = near(destination);
    let best: Omit<BusOption, "live" | "wait" | "leaveIn" | "total"> & { boardIndex: number } | null = null;
    for (const b of boards) for (const a of alights) {
      if (a.i === b.i || a.stop.id === b.stop.id) continue;
      const ride = rideSeconds(route, b.i, a.i);
      if (ride == null) continue;
      const tripTime = b.walk + ride + a.walk;
      if (!best || tripTime < best.tripTime) best = { route, board: b.stop, alight: a.stop, walkToStop: b.walk, rideTime: ride, walkFromStop: a.walk, tripTime, boardIndex: b.i };
    }
    // Walking to and from the stops alone takes as long as just walking there: the bus can't help.
    if (!best || best.walkToStop + best.walkFromStop >= walkTime) continue;
    const { boardIndex, ...option } = best;
    const etas = buses.filter((bus) => bus.routeId === route.id)
      .map((bus) => busEtaSeconds(route, network.stops, bus.at, boardIndex))
      .filter((eta): eta is number => eta != null);
    if (!etas.length) {
      options.push({ ...option, live: false, wait: null, leaveIn: null, total: null });
      continue;
    }
    const catchable = etas.filter((eta) => eta + CATCH_GRACE_S >= option.walkToStop);
    const lap = lapSeconds(route);
    // Every bus passes before you get there: the soonest one comes back after a full lap.
    const wait = catchable.length ? Math.min(...catchable) : lap != null ? Math.min(...etas) + lap : null;
    if (wait == null) {
      options.push({ ...option, live: false, wait: null, leaveIn: null, total: null });
      continue;
    }
    options.push({ ...option, live: true, wait, leaveIn: Math.max(0, wait - option.walkToStop),
      total: Math.max(option.walkToStop, wait) + option.rideTime + option.walkFromStop });
  }
  options.sort((a, b) => (a.live === b.live ? (a.total ?? a.tripTime) - (b.total ?? b.tripTime) : a.live ? -1 : 1));
  return { options, walkTime };
}

/** "Now", "1 min", "12 min": rounded minutes for people on the move. */
export function formatMinutes(seconds: number): string {
  const m = Math.round(seconds / 60);
  return m <= 0 ? "Now" : `${m} min`;
}

/** One route's status for the bus list: is it running, its nearest stop to you, and the next bus there. */
export interface RouteStatus {
  route: TransitRoute;
  /** Live buses on the route right now. */
  running: number;
  /** The route's stop closest to you (within walking reach), or null without a position or none near. */
  nearStop: TransitStop | null;
  walkToStop: number | null;
  /** Seconds until the next live bus reaches `nearStop`, or null. */
  nextBus: number | null;
}

/** Every route with a stop sequence, for the "buses near you" list: running routes first, soonest bus at your nearest stop first, then the rest by name. */
export function routeStatuses(network: TransitNetwork, buses: LiveBus[], here: LngLat | null): RouteStatus[] {
  const list = network.routes.filter((r) => r.stops.length >= 2).map((route): RouteStatus => {
    const mine = buses.filter((b) => b.routeId === route.id);
    let nearIndex = -1;
    let nearDist = Infinity;
    if (here) route.stops.forEach((s, i) => {
      const stop = network.stops.get(s.stop);
      const d = stop ? meters(here, stop.at) : Infinity;
      if (d < nearDist) { nearDist = d; nearIndex = i; }
    });
    const reachable = nearIndex >= 0 && nearDist <= MAX_WALK_TO_STOP_M * 1.5;
    const nearStop = reachable ? network.stops.get(route.stops[nearIndex].stop) ?? null : null;
    const etas = reachable ? mine.map((b) => busEtaSeconds(route, network.stops, b.at, nearIndex)).filter((e): e is number => e != null) : [];
    return { route, running: mine.length, nearStop, walkToStop: nearStop && here ? walkSeconds(here, nearStop.at) : null, nextBus: etas.length ? Math.min(...etas) : null };
  });
  const rank = (s: RouteStatus) => (s.running ? (s.nextBus != null ? 0 : 1) : 2);
  return list.sort((a, b) => rank(a) - rank(b) || (a.nextBus ?? 0) - (b.nextBus ?? 0) || a.route.name.localeCompare(b.route.name));
}
