// Central place for map settings. Change here, not inside components.
export const CAMPUS = {
  name: "Georgia Tech",
  center: [-84.3963, 33.7756] as [number, number], // [lng, lat]
  zoom: 15.6,
  // Rough campus bounds so users can't pan off to another continent.
  bounds: [
    [-84.42, 33.76],
    [-84.375, 33.79],
  ] as [[number, number], [number, number]],
};

// Free OpenStreetMap raster tiles: no API key needed. Fine for a hackathon;
// swap for MapTiler/Mapbox/self-hosted vector tiles if traffic grows.
export const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
/** Attribution text OSM requires next to the tiles. */
export const TILE_ATTRIBUTION = "© OpenStreetMap contributors";
