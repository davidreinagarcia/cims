/** @file Loads MapLibre GL JS on demand as its own chunk, so the interface can paint before the 800 KB map library has arrived. */
type MapLibre = typeof import("maplibre-gl");

let pending: Promise<MapLibre> | null = null;

/** Starts (or reuses) the MapLibre download. main.tsx calls it first thing so it runs in parallel with the app code. */
export function loadMapLibre(): Promise<MapLibre> {
  pending ??= import("maplibre-gl");
  return pending;
}
