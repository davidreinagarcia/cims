<!-- summary: Accepted: MapLibre with 3D extrusion of our own OSM-derived building footprints. -->
# ADR-0003: MapLibre GL JS with 3D extrusion for the campus map

- **Status:** **Accepted** (2026-11-14). MapLibre already in use; 3D via our own building footprints (option b below), agreed by the team
- **Date:** 2026-11-14
- **Deciders:** _TBD_ (ratify at M0)
- **Related:** F-01, F-02, F-06, F-16; Risks R-04, R-08

## Context and problem statement

The brainstorm asks for a "3D model of GT" with an "isometric view" and "clickable buildings", plus
indoor floor plans. A full custom 3D scene is expensive; a flat map loses the "recognize the
building" benefit. Which rendering approach do we use?

## Decision drivers

- Clickable buildings with highlight
- 3D / isometric feel without modeling every building by hand
- Custom indoor layers per floor
- Free, no per-load billing, no API key lock-in

## Considered options

1. MapLibre GL JS + `fill-extrusion` building footprints (OSM heights), tilted camera
2. Google Maps JavaScript API (incl. 3D tiles)
3. Mapbox GL JS
4. Custom Three.js / react-three-fiber campus model

## Decision outcome

**Chosen option:** MapLibre GL JS with extruded OSM building footprints and a pitched camera,
because it gives a convincing isometric 3D campus for close to zero effort, supports custom GeoJSON
layers for POIs and indoor floors, and is open-source with no billing.

### Consequences

- 👍 Buildings are GeoJSON polygons, so click/highlight and attribute joins are trivial.
- 👍 The same engine renders indoor levels as filtered GeoJSON layers.
- 👎 Not photorealistic; F-16 (street view / VR) would need a separate viewer later.
- ⚠️ OSM footprint/height quality on campus must be checked at M1 (Risk R-08). Fallback is to
  hand-fix footprints for the pilot area.
- ⚠️ Today the app uses **OSM raster tiles** (`src/config.ts`), which have no building geometry to
  extrude. 3D needs either (a) vector tiles with a `building` layer (e.g., OpenFreeMap, self-hosted
  PMTiles), or (b) our own building footprints as GeoJSON in `src/data/` with a `height` property.
  **Decision: option (b).** Footprints are exported once from OSM (Overpass) by a committed script
  into `src/data/buildings.geojson`, curated by hand (IDs, names, aliases, heights) and rendered with
  `fill-extrusion` on top of the raster base map. That gives us clickable buildings with stable IDs
  that the building card, search and indoor view can share. Work items: T-03, T-10 in
  [WORKPLAN](../WORKPLAN.md).
- ⚠️ The public `tile.openstreetmap.org` server has a usage policy that discourages heavy app
  traffic; fine for the hackathon, switch before any real launch.

## Pros and cons of the options

### Google Maps JS API
- 👍 Familiar; photoreal 3D tiles
- 👎 API key, billing account, quota risk; limited styling of individual buildings

### Mapbox GL JS
- 👍 Same API family, polished
- 👎 Proprietary license since v2, token, usage billing

### Three.js custom model
- 👍 Full creative control, true 3D
- 👎 Modeling effort far beyond hackathon scope; geo alignment, labels, picking all hand-built

## Validation

M1 spike: pilot area renders extruded buildings at ≥ 30 fps on a mid-range phone; building tap
returns the correct `building.id`.
