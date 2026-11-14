/** @file The map's base style: paper background, OSM raster tiles washed out to a drafted gray (ADR-0006 step 1), the fixed light and the glyph server for labels. Swap here for a vector basemap (ADR-0006). */
import type { StyleSpecification } from "maplibre-gl";
import { MAP_LIGHT, TILE_ATTRIBUTION, TILE_URL } from "../config";
import { PAPER } from "./palette";

/** Base style every layer is added on top of. */
export const baseStyle: StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    osm: { type: "raster", tiles: [TILE_URL], tileSize: 256, maxzoom: 19, attribution: TILE_ATTRIBUTION },
  },
  light: MAP_LIGHT,
  layers: [
    { id: "paper", type: "background", paint: { "background-color": PAPER } },
    {
      id: "osm",
      type: "raster",
      source: "osm",
      // Desaturate and lift the blacks, then let the paper show through: OSM reads as a muted drafted base.
      paint: { "raster-saturation": -1, "raster-brightness-min": 0.35, "raster-contrast": -0.2, "raster-opacity": 0.55 },
    },
  ],
};
