/** @file Remembers where each live bus was between polls, to tell how long it has been standing still and which way it is moving. */
import { haversineMeters } from "./geolocation";

type LngLat = [number, number];
/** Moving less than this from where it stopped still counts as standing still (GPS jitter, creeping in traffic). */
const STILL_M = 25;
/** A step this long is enough to read a direction from. */
const BEARING_MIN_M = 10;
/** Forget a bus not seen for this long (end of shift, out of range). */
const FORGET_MS = 5 * 60_000;

interface Track { anchor: LngLat; since: number; last: LngLat; seen: number; bearing: number | null }
const tracks = new Map<string, Track>();

const meters = (a: LngLat, b: LngLat) => haversineMeters({ lng: a[0], lat: a[1] }, { lng: b[0], lat: b[1] });

/** Compass bearing in degrees (0 = north, clockwise) from `a` to `b`. */
export function bearingDegrees(a: LngLat, b: LngLat): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const [lng1, lat1] = [toRad(a[0]), toRad(a[1])];
  const [lng2, lat2] = [toRad(b[0]), toRad(b[1])];
  const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** What we know about a bus's motion: when it last stopped moving (ms timestamp) and its direction of travel from its own track. */
export interface Motion { stillSince: number; bearing: number | null }

/** Records one poll's positions and returns each bus's motion. A bus first seen now counts as still since now (we can't know earlier). */
export function recordMotion(buses: { id: string; at: LngLat }[], now = Date.now()): Map<string, Motion> {
  const out = new Map<string, Motion>();
  for (const { id, at } of buses) {
    let track = tracks.get(id);
    if (!track) {
      track = { anchor: at, since: now, last: at, seen: now, bearing: null };
      tracks.set(id, track);
    } else {
      if (meters(track.last, at) >= BEARING_MIN_M) track.bearing = bearingDegrees(track.last, at);
      if (meters(track.anchor, at) > STILL_M) { track.anchor = at; track.since = now; }
      track.last = at;
      track.seen = now;
    }
    out.set(id, { stillSince: track.since, bearing: track.bearing });
  }
  for (const [id, track] of tracks) if (now - track.seen > FORGET_MS) tracks.delete(id);
  return out;
}

/** "Stopped for 3 min" once a bus has stood still at least 90 seconds; null while it moves. */
export function stoppedText(stillSince: number, now = Date.now()): string | null {
  const seconds = (now - stillSince) / 1000;
  if (seconds < 90) return null;
  return `Stopped for ${Math.round(seconds / 60)} min`;
}

/** "north", "northeast", ... for a compass bearing. */
export function compassWord(bearing: number): string {
  const words = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];
  return words[Math.round((((bearing % 360) + 360) % 360) / 45) % 8];
}
