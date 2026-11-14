/** @file The map's base style: raster OSM tiles plus the glyph server for labels. Swap here for a vector basemap (ADR-0006). */
import type { StyleSpecification } from "maplibre-gl";
import { TILE_ATTRIBUTION, TILE_URL } from "../config";

/** Base style every layer is added on top of. */
export const baseStyle: StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    osm: { type: "raster", tiles: [TILE_URL], tileSize: 256, attribution: TILE_ATTRIBUTION },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};
