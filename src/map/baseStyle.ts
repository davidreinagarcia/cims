/** @file The map's base style: OpenFreeMap vector tiles colored per kind of ground (campus, grass, water, roads, walkways), the fixed light and the glyph server (ADR-0006 step 2). */
import type { ExpressionSpecification, LayerSpecification, StyleSpecification } from "maplibre-gl";
import { BASEMAP_TILEJSON, MAP_LIGHT, TILE_ATTRIBUTION } from "../config";
import {
  INK, PAPER, MAP_CAMPUS, MAP_GRASS, MAP_WOOD, MAP_WATER, MAP_ROAD_MAJOR, MAP_ROAD_MAJOR_CASE,
  MAP_ROAD_MINOR, MAP_ROAD_MINOR_CASE, MAP_WALKWAY, MAP_RAIL, MAP_BUILDING_CONTEXT,
} from "./palette";

const SRC = "base";

/** Line width that grows with zoom: [zoom, px] stops, exponential like real road widths. */
function widthByZoom(stops: [number, number][]): ExpressionSpecification {
  return ["interpolate", ["exponential", 1.6], ["zoom"], ...stops.flat()] as ExpressionSpecification;
}

const MAJOR = ["motorway", "trunk", "primary"];
const MID = ["secondary", "tertiary"];
const MINOR = ["minor", "service", "track", "raceway"];
const WALK = ["path", "pedestrian"]; // OpenMapTiles puts footway/steps/cycleway under class "path"
const notTunnel: ExpressionSpecification = ["!=", ["get", "brunnel"], "tunnel"];
const classIn = (list: string[]): ExpressionSpecification => ["in", ["get", "class"], ["literal", list]];

const STOPS = { major: [[12, 1.5], [15, 6], [18, 22]], mid: [[12, 1], [15, 4.5], [18, 16]], minor: [[13, 0.5], [15, 2.5], [18, 10]] } satisfies Record<string, [number, number][]>;
const roadWidth = { major: widthByZoom(STOPS.major), mid: widthByZoom(STOPS.mid), minor: widthByZoom(STOPS.minor) };
/** Casing = the same road 1.5 px wider (zoom expressions can't be wrapped in math, so widen the stops). */
const casing = (k: keyof typeof STOPS): ExpressionSpecification => widthByZoom(STOPS[k].map(([z, w]) => [z, w + 1.5] as [number, number]));

const layers: LayerSpecification[] = [
  { id: "paper", type: "background", paint: { "background-color": PAPER } },

  // Ground: campus first, then green and water over it.
  { id: "landuse-campus", type: "fill", source: SRC, "source-layer": "landuse", filter: classIn(["university", "college", "school"]), paint: { "fill-color": MAP_CAMPUS } },
  { id: "landuse-sports", type: "fill", source: SRC, "source-layer": "landuse", filter: classIn(["pitch", "stadium", "track", "playground"]), paint: { "fill-color": MAP_GRASS, "fill-outline-color": INK } },
  { id: "park", type: "fill", source: SRC, "source-layer": "park", paint: { "fill-color": MAP_GRASS } },
  { id: "landcover-grass", type: "fill", source: SRC, "source-layer": "landcover", filter: classIn(["grass", "farmland", "wetland"]), paint: { "fill-color": MAP_GRASS } },
  { id: "landcover-wood", type: "fill", source: SRC, "source-layer": "landcover", filter: classIn(["wood", "forest"]), paint: { "fill-color": MAP_WOOD } },
  { id: "water", type: "fill", source: SRC, "source-layer": "water", paint: { "fill-color": MAP_WATER, "fill-outline-color": INK } },
  { id: "waterway", type: "line", source: SRC, "source-layer": "waterway", paint: { "line-color": MAP_WATER, "line-width": widthByZoom([[13, 0.5], [18, 4]]) } },

  // Off-campus buildings for context: flat and quiet. Ours (layers/buildings.ts) are extruded and hatched on top.
  { id: "building-context", type: "fill", source: SRC, "source-layer": "building", minzoom: 14, paint: { "fill-color": MAP_BUILDING_CONTEXT, "fill-outline-color": MAP_ROAD_MINOR_CASE } },

  // Roads: casings first, then fills, so crossings read cleanly.
  { id: "road-minor-case", type: "line", source: SRC, "source-layer": "transportation", filter: ["all", classIn(MINOR), notTunnel], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": MAP_ROAD_MINOR_CASE, "line-width": casing("minor") } },
  { id: "road-mid-case", type: "line", source: SRC, "source-layer": "transportation", filter: ["all", classIn(MID), notTunnel], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": MAP_ROAD_MAJOR_CASE, "line-width": casing("mid") } },
  { id: "road-major-case", type: "line", source: SRC, "source-layer": "transportation", filter: ["all", classIn(MAJOR), notTunnel], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": MAP_ROAD_MAJOR_CASE, "line-width": casing("major") } },
  { id: "road-minor", type: "line", source: SRC, "source-layer": "transportation", filter: ["all", classIn(MINOR), notTunnel], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": MAP_ROAD_MINOR, "line-width": roadWidth.minor } },
  { id: "road-mid", type: "line", source: SRC, "source-layer": "transportation", filter: ["all", classIn(MID), notTunnel], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": MAP_ROAD_MAJOR, "line-width": roadWidth.mid } },
  { id: "road-major", type: "line", source: SRC, "source-layer": "transportation", filter: ["all", classIn(MAJOR), notTunnel], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": MAP_ROAD_MAJOR, "line-width": roadWidth.major } },

  // Walkways: the campus is mostly walked, so they get their own color. Steps are dashed.
  { id: "walkway", type: "line", source: SRC, "source-layer": "transportation", minzoom: 14, filter: ["all", classIn(WALK), ["!=", ["get", "subclass"], "steps"], notTunnel], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": MAP_WALKWAY, "line-width": widthByZoom([[14, 0.6], [16, 1.6], [18, 4]]) } },
  { id: "walkway-steps", type: "line", source: SRC, "source-layer": "transportation", minzoom: 16, filter: ["all", classIn(WALK), ["==", ["get", "subclass"], "steps"]], paint: { "line-color": MAP_WALKWAY, "line-width": widthByZoom([[16, 1.6], [18, 4]]), "line-dasharray": [0.6, 0.4] } },
  { id: "rail", type: "line", source: SRC, "source-layer": "transportation", filter: classIn(["rail", "transit"]), paint: { "line-color": MAP_RAIL, "line-width": widthByZoom([[13, 0.8], [18, 2.5]]), "line-dasharray": [3, 2] } },

  // Street names in letter-spaced caps along the road (the survey-map signature).
  {
    id: "road-label", type: "symbol", source: SRC, "source-layer": "transportation_name", minzoom: 15,
    filter: ["!", classIn(WALK)],
    layout: {
      "symbol-placement": "line", "text-field": ["upcase", ["coalesce", ["get", "name:en"], ["get", "name"]]],
      "text-font": ["Open Sans Semibold"], "text-size": 10.5, "text-letter-spacing": 0.15, "text-max-angle": 30,
    },
    paint: { "text-color": INK, "text-halo-color": PAPER, "text-halo-width": 1.5 },
  },
];

/** Base style every layer is added on top of. */
export const baseStyle: StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: { [SRC]: { type: "vector", url: BASEMAP_TILEJSON, attribution: TILE_ATTRIBUTION } },
  light: MAP_LIGHT,
  layers,
};
