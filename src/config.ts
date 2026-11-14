/** @file Campus map settings and the base URL for correction issues. */
// Central place for map settings. Change here, not inside components.
export const CAMPUS = {
  name: "Georgia Tech",
  center: [-84.3963, 33.7756] as [number, number], // [lng, lat]
  zoom: 15.6,
  // Tilted "survey drawing" view (DESIGN-DIRECTION § Map styling). The 2D/3D toggle returns here.
  pitch: 55,
  bearing: -20,
  // Rough campus bounds so users can't pan off to another continent.
  bounds: [
    [-84.42, 33.76],
    [-84.375, 33.79],
  ] as [[number, number], [number, number]],
};

/** Fixed light for the extruded buildings: anchored to the map so wall shading doesn't change as you rotate. */
export const MAP_LIGHT = { anchor: "map" as const, position: [1.5, 210, 30] as [number, number, number], intensity: 0.3 };

// Free OpenStreetMap raster tiles: no API key needed. Fine for a hackathon;
// swap for MapTiler/Mapbox/self-hosted vector tiles if traffic grows.
export const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
/** Attribution text OSM requires next to the tiles. */
export const TILE_ATTRIBUTION = "© OpenStreetMap contributors";

/** Base URL for prefilled place correction issues. */
export const CORRECTION_URL = "https://github.com/davidreinagarcia/cims/issues/new";
