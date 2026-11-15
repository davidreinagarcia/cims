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

/** Vector basemap (ADR-0006 step 2): OpenFreeMap, free and keyless, OpenMapTiles schema. */
export const BASEMAP_TILEJSON = "https://tiles.openfreemap.org/planet";
/** Attribution OpenFreeMap and OpenStreetMap require next to the map. */
export const TILE_ATTRIBUTION = "© <a href=\"https://openfreemap.org\" target=\"_blank\">OpenFreeMap</a> © <a href=\"https://www.openmaptiles.org/\" target=\"_blank\">OpenMapTiles</a> © <a href=\"https://www.openstreetmap.org/copyright\" target=\"_blank\">OpenStreetMap</a>";

/** Base URL for prefilled place correction issues. */
export const CORRECTION_URL = "https://github.com/davidreinagarcia/cims/issues/new";

/** The app's own live production URL (README), used where a share target needs a public link (LinkedIn has no raw-text share). */
export const SITE_URL = "https://cims.queenalexandria.online";
