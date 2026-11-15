/** @file Remembers where each live bus was between polls, to tell how long it has been standing still and which way it is moving. */
import { haversineMeters } from "./geolocation";

type LngLat = [number, number];
/** Moving less than this from where it stopped still counts as standing still (GPS jitter, creeping in traffic). */
const STILL_M = 25;
/** A step this long is enough to read a direction from. */
const BEARING_MIN_M = 10;
/** Forget a bus not seen for this long (end of shift, out of range). */
const FORGET_MS = 5 * 60_000;

/** Two reports whose fix times are this close are the same GPS fix repeated (the tracker rounds its age to seconds). */
const SAME_FIX_MS = 2_000;

interface Track { anchor: LngLat; anchorFix: number; last: LngLat; lastFix: number; seen: number; bearing: number | null }
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

/** What we know about a bus's motion: how long (ms) its GPS fixes have shown it in the same spot, and its direction of travel from its own track. */
export interface Motion { stillFor: number; bearing: number | null }

/** Records one poll's positions, each with the time of its GPS fix, and returns each bus's motion.
 *  Stillness is measured between fixes, not between polls: a tracker repeating an old fix must not read as a stopped bus.
 *  A bus first seen now has stood still for 0 (we can't know earlier). */
export function recordMotion(buses: { id: string; at: LngLat; fixAt: number }[], now = Date.now()): Map<string, Motion> {
  const out = new Map<string, Motion>();
  for (const { id, at, fixAt } of buses) {
    let track = tracks.get(id);
    if (!track) {
      track = { anchor: at, anchorFix: fixAt, last: at, lastFix: fixAt, seen: now, bearing: null };
      tracks.set(id, track);
    } else if (fixAt - track.lastFix >= SAME_FIX_MS) {
      if (meters(track.last, at) >= BEARING_MIN_M) track.bearing = bearingDegrees(track.last, at);
      if (meters(track.anchor, at) > STILL_M) { track.anchor = at; track.anchorFix = fixAt; }
      track.last = at;
      track.lastFix = fixAt;
    }
    track.seen = now;
    out.set(id, { stillFor: Math.max(0, track.lastFix - track.anchorFix), bearing: track.bearing });
  }
  for (const [id, track] of tracks) if (now - track.seen > FORGET_MS) tracks.delete(id);
  return out;
}

/** "Stopped for 3 min" once a bus has stood still at least 90 seconds (`stillFor` in ms); null while it moves. */
export function stoppedText(stillFor: number): string | null {
  const seconds = stillFor / 1000;
  if (seconds < 90) return null;
  return `Stopped for ${Math.round(seconds / 60)} min`;
}

/** "north", "northeast", ... for a compass bearing. */
export function compassWord(bearing: number): string {
  const words = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];
  return words[Math.round((((bearing % 360) + 360) % 360) / 45) % 8];
}
