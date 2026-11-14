/** @file Discovers every layer module in src/map/layers/ and returns them in draw order. */
import type { MapLayer } from "./types";

const modules = import.meta.glob<{ default: MapLayer }>("./layers/*.ts", { eager: true });

/** All layers found in src/map/layers/, sorted by their `order` (default 100). */
export function loadLayers(): MapLayer[] {
  return Object.values(modules)
    .map((m) => m.default)
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}
