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
/** A live bus as the planner needs it; `stillSince` is when it last stopped moving (ms), if known. */
export interface LiveBus { id: string; routeId: number; at: [number, number]; stillSince?: number; heading?: number | null }

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
  /** When the bus you'd catch last stopped moving (ms), or null. */
  busStillSince: number | null;
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

/** Where a live bus is on its route: at stop `at`, or driving the leg from `from` to `to` with `left` scheduled seconds to go. */
export type BusLeg = { at: number } | { from: number; to: number; left: number };

/** Places a live bus on its route: on the stop-to-stop leg it's closest to, at a stop when near one. Loops pass the
 *  same street twice (one leg each way), so with a `heading` (degrees) legs pointing the other way are skipped. */
export function busLeg(route: TransitRoute, stops: Map<string, TransitStop>, bus: LngLat, heading: number | null = null): BusLeg | null {
  const n = route.stops.length;
  const at = (i: number) => stops.get(route.stops[(i + n) % n].stop)?.at;
  // Local flat meters around the bus: plenty accurate across a campus.
  const kx = 111_320 * Math.cos((bus[1] * Math.PI) / 180);
  const ky = 110_540;
  const xy = (p: LngLat) => [(p[0] - bus[0]) * kx, (p[1] - bus[1]) * ky];
  let best: { i: number; t: number; d: number } | null = null;
  for (let i = 0; i < n; i++) {
    const a = at(i);
    const b = at(i + 1);
    if (!a || !b) continue;
    const [ax, ay] = xy(a);
    const [bx, by] = xy(b);
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
    let d = Math.hypot(ax + t * dx, ay + t * dy);
    if (heading != null) {
      const legBearing = (Math.atan2(dx, dy) * 180) / Math.PI;
      const diff = Math.abs((((heading - legBearing) % 360) + 540) % 360 - 180);
      if (diff > 100) d += 500; // driving the other way: only if nothing else fits
    }
    if (!best || d < best.d) best = { i, t, d };
  }
  if (!best) return null;
  const from = best.i;
  const to = (from + 1) % n;
  const fromAt = at(from)!;
  const toAt = at(to)!;
  if (meters(bus, fromAt) <= AT_STOP_M && best.t < 0.5) return { at: from };
  if (meters(bus, toAt) <= AT_STOP_M) return { at: to };
  const leg = route.stops[from].to_next_s;
  if (leg == null) return null;
  return { from, to, left: (1 - best.t) * leg };
}

/** The stop a live bus serves next (index), or null if it can't be placed. A bus sitting at a stop is serving that stop. */
export function nextStopIndex(route: TransitRoute, stops: Map<string, TransitStop>, bus: LngLat, heading: number | null = null): number | null {
  const leg = busLeg(route, stops, bus, heading);
  return leg == null ? null : "at" in leg ? leg.at : leg.to;
}

/** Seconds until a live bus reaches stop index `target`. */
export function busEtaSeconds(route: TransitRoute, stops: Map<string, TransitStop>, bus: LngLat, target: number, heading: number | null = null): number | null {
  const leg = busLeg(route, stops, bus, heading);
  if (!leg) return null;
  if ("at" in leg) return rideSeconds(route, leg.at, target);
  if (leg.to === target) return leg.left;
  const rest = rideSeconds(route, leg.to, target);
  return rest == null ? null : leg.left + (route.stops[leg.to].dwell_s ?? 0) + rest;
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
    let best: Omit<BusOption, "live" | "wait" | "leaveIn" | "total" | "busStillSince"> & { boardIndex: number } | null = null;
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
    const timed = buses.filter((bus) => bus.routeId === route.id)
      .map((bus) => ({ bus, eta: busEtaSeconds(route, network.stops, bus.at, boardIndex, bus.heading ?? null) }))
      .filter((t): t is { bus: LiveBus; eta: number } => t.eta != null);
    const etas = timed.map((t) => t.eta);
    if (!etas.length) {
      options.push({ ...option, live: false, wait: null, leaveIn: null, total: null, busStillSince: null });
      continue;
    }
    const catchable = etas.filter((eta) => eta + CATCH_GRACE_S >= option.walkToStop);
    const lap = lapSeconds(route);
    // Every bus passes before you get there: the soonest one comes back after a full lap.
    const wait = catchable.length ? Math.min(...catchable) : lap != null ? Math.min(...etas) + lap : null;
    if (wait == null) {
      options.push({ ...option, live: false, wait: null, leaveIn: null, total: null, busStillSince: null });
      continue;
    }
    const caught = timed.reduce<{ bus: LiveBus; eta: number } | null>((best, t) =>
      (t.eta + CATCH_GRACE_S >= option.walkToStop || !catchable.length) && (!best || t.eta < best.eta) ? t : best, null);
    options.push({ ...option, live: true, wait, leaveIn: Math.max(0, wait - option.walkToStop),
      total: Math.max(option.walkToStop, wait) + option.rideTime + option.walkFromStop, busStillSince: caught?.bus.stillSince ?? null });
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
  /** When that next bus last stopped moving (ms), or null. */
  nextBusStillSince: number | null;
}

/** Every route with a stop sequence, for the "buses near you" list: running routes first, soonest bus at your nearest stop first, then the rest by name. */
export function routeStatuses(network: TransitNetwork, buses: LiveBus[], here: LngLat | null): RouteStatus[] {
  const list = network.routes.filter((r) => r.stops.length >= 2).map((route): RouteStatus => {
    const mine = buses.filter((b) => b.routeId === route.id);
    // Stops within walking reach. A loop often has one on each side of the street: pick the one where you'd
    // board soonest (walk there, then wait for the next bus you can catch), else simply the closest. Walking
    // counts a little extra, so a far stop must save real time to beat a close one.
    const reach = here ? route.stops.flatMap((s, i) => {
      const stop = network.stops.get(s.stop);
      return stop && meters(here, stop.at) <= MAX_WALK_TO_STOP_M ? [{ i, stop, walk: walkSeconds(here, stop.at) }] : [];
    }) : [];
    let pick: { stop: TransitStop; walk: number; bus: LiveBus | null; eta: number | null; board: number } | null = null;
    for (const c of reach) {
      let soonest: { bus: LiveBus; eta: number } | null = null;
      for (const bus of mine) {
        const eta = busEtaSeconds(route, network.stops, bus.at, c.i, bus.heading ?? null);
        if (eta != null && eta + CATCH_GRACE_S >= c.walk && (!soonest || eta < soonest.eta)) soonest = { bus, eta };
      }
      const board = soonest ? Math.max(c.walk, soonest.eta) + c.walk * 0.5 : Infinity;
      if (!pick || board < pick.board || (board === Infinity && pick.board === Infinity && c.walk < pick.walk)) {
        pick = { stop: c.stop, walk: c.walk, bus: soonest?.bus ?? null, eta: soonest?.eta ?? null, board };
      }
    }
    return { route, running: mine.length, nearStop: pick?.stop ?? null, walkToStop: pick?.walk ?? null,
      nextBus: pick?.eta ?? null, nextBusStillSince: pick?.bus?.stillSince ?? null };
  });
  const rank = (s: RouteStatus) => (s.running ? (s.nextBus != null ? 0 : 1) : 2);
  return list.sort((a, b) => rank(a) - rank(b) || (a.nextBus ?? 0) - (b.nextBus ?? 0) || a.route.name.localeCompare(b.route.name));
}
