/** @file Survey-map colors as literals for MapLibre paint and canvas drawing. Mirrors src/styles/tokens.css: change both together. */

/** --ink: outlines, hatching, map labels. */
export const INK = "#1C2733";
/** --paper: map background, label halos, hatch ground. */
export const PAPER = "#F3EEE2";
/** --paper-2: building walls (a step darker than the ground, so roofs read as the lightest plane). */
export const PAPER_2 = "#E9E2D0";
/** --white: building roofs. */
export const WHITE = "#FFFFFF";
/** --gold: selected roof, selected hatch ground. */
export const GOLD = "#B3A369";
/** --gold-ink: gold linework on paper (selected hatch lines). */
export const GOLD_INK = "#8A7A3E";

// ---- Basemap (ADR-0006 step 2): one color per kind of ground, muted to sit under the ink linework. ----
/** --map-campus: university/college land, a sage tint so campus reads as one place. */
export const MAP_CAMPUS = "#D2DCC0";
/** --map-grass: lawns, parks, pitches. */
export const MAP_GRASS = "#A8BB94";
/** --map-wood: trees and wooded areas, a step darker than grass. */
export const MAP_WOOD = "#93A985";
/** --map-water: ponds, fountains, streams. */
export const MAP_WATER = "#A3B9C9";
/** --map-road-major: motorways and arterials (old-gold family, lighter than --gold). */
export const MAP_ROAD_MAJOR = "#D9C38E";
/** Casing for major roads. */
export const MAP_ROAD_MAJOR_CASE = "#A8925A";
/** --map-road-minor: streets and service roads (white with a hairline casing, like a drafted plan). */
export const MAP_ROAD_MINOR = "#FFFFFF";
/** Casing for minor roads. */
export const MAP_ROAD_MINOR_CASE = "#C9BFA8";
/** --map-walkway: footways, pedestrian paths and steps (terracotta, lighter than the brick --route so routes stay on top). */
export const MAP_WALKWAY = "#D49C7F";
/** --map-rail: rail and tram lines. */
export const MAP_RAIL = "#7D7766";
/** --map-building-context: off-campus buildings, flat (ours are the extruded, hatched ones). */
export const MAP_BUILDING_CONTEXT = "#E4DCC8";
/** --cat-transport: bus routes, stops and live buses. */
export const SAGE = "#5E7A5A";
