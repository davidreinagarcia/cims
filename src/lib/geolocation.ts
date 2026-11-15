/** @file Typed wrapper around the browser Geolocation API (T-61) plus haversine distance math, shared by "Rooms near me" and location check-in. Building-level only -- there is no indoor positioning hardware. */

/** Every real-world way `getCurrentPosition` can fail, each with its own honest, human message. */
export type GeolocationFailureReason = "unsupported" | "denied" | "unavailable" | "timeout";

const MESSAGES: Record<GeolocationFailureReason, string> = {
  unsupported: "This browser doesn't support location services.",
  denied: "Location access was denied. Allow location for this site in your browser settings, or pick a building manually.",
  unavailable: "Your location couldn't be determined right now. Try again, or pick a building manually.",
  timeout: "Finding your location took too long. Try again, or pick a building manually.",
};

/** A geolocation failure with a stable `reason` for branching and a ready-to-show `message`. A real `Error`, so normal `catch`/`instanceof Error` handling works. */
export class GeolocationError extends Error {
  reason: GeolocationFailureReason;
  constructor(reason: GeolocationFailureReason) {
    super(MESSAGES[reason]);
    this.name = "GeolocationError";
    this.reason = reason;
  }
}

/** A GPS fix: WGS84 degrees plus the device's own reported accuracy radius in meters. */
export interface Coordinates { lat: number; lng: number; accuracy: number }

/**
 * One-shot current position. Never throws a raw `GeolocationPositionError` or lets "the API doesn't
 * exist" crash the caller -- every failure path (unsupported browser, permission denied, position
 * unavailable, timeout) rejects with a {@link GeolocationError} carrying a user-facing message.
 */
export function getCurrentPosition(options: PositionOptions = { timeout: 10_000, maximumAge: 30_000 }): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new GeolocationError("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) reject(new GeolocationError("denied"));
        else if (error.code === error.TIMEOUT) reject(new GeolocationError("timeout"));
        else reject(new GeolocationError("unavailable"));
      },
      options,
    );
  });
}

/** Great-circle distance in meters between two lng/lat points (haversine, mean Earth radius). Accurate enough for building-scale "near me" sorting and a check-in radius; not for indoor positioning. */
export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const earthRadiusMeters = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * earthRadiusMeters * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "~180 m away" / "~1.2 km away": rounds to a sensible precision for an approximate, building-level distance -- never implies more precision than a GPS fix actually has. */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return "distance unknown";
  if (meters < 1000) return `~${Math.max(10, Math.round(meters / 10) * 10)} m away`;
  return `~${(meters / 1000).toFixed(1)} km away`;
}
