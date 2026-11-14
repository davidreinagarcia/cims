/** @file Contract for map layers: every file in src/map/layers/ default-exports one MapLayer. */
import type maplibregl from "maplibre-gl";
import type { Selection } from "../state/selection";

/** What the host gives a layer so it can talk back to the app. */
export interface LayerContext {
  /** Report that the user picked something on this layer (or null to clear). */
  select: (selection: Selection | null) => void;
}

/** What a layer returns from addTo so the host can drive it. */
export interface LayerHandle {
  /** Called right after addTo and again every time the selection changes. */
  update?: (selection: Selection | null) => void;
  /** Remove everything the layer added to the map (sources, layers, listeners). */
  remove: () => void;
}

/**
 * A self-contained piece of the map. Drop a file in src/map/layers/ that default-exports one of
 * these and it is loaded automatically: no registry to edit.
 */
export interface MapLayer {
  id: string;
  /** Lower numbers are added first, so they draw underneath. Default 100. */
  order?: number;
  /** Called once the map style is ready. Add sources, layers and listeners here. */
  addTo: (map: maplibregl.Map, ctx: LayerContext) => LayerHandle;
}
