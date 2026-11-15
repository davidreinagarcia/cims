<!-- summary: Code layout: where each kind of code and data goes in src/. -->
# Architecture

Single-page web app. No backend yet; everything the map shows lives in `src/data/`.

```
src/
  App.tsx              shell: AuthProvider + SelectionProvider + sidebar + map
  config.ts            campus center, bounds, tile source (one place to tweak the map)
  types.ts             Category + PlaceProperties
  auth/                replaceable AuthAdapter contract, fictional personas and localStorage mock session
  state/auth.tsx       AuthProvider, useAuth(), pending demo action and sign-in dialog state
  state/selection.tsx  Selection {kind, id}, SelectionProvider, useSelection()
  map/
    types.ts           the layer contract (MapLayer, LayerHandle, LayerContext, LayerFilters)
    pins.ts            draws the survey pins (teardrop + category glyph) on a canvas and registers them with the map
    ../lib/buildings.ts  building footprints loaded once on demand: lookup of the building containing a point (3D layer, building card, place selection)
    maplibre.ts        loads MapLibre GL JS on demand as its own chunk (prefetched from main.tsx) so the interface paints first
    layerFilters.ts    LayerFilters to a MapLibre filter (`buildMapFilter`) and `isVisible`
    baseStyle.ts       base style (OSM raster tiles + glyphs); swap for a vector basemap here
    loadLayers.ts      finds every file in layers/ automatically (import.meta.glob)
    layers/
      pois.ts          places: filtered clusters and shared-location picker, survey pins/labels, independent gold selection
  components/
    MapView.tsx        host: creates the map, loads layers, passes them the selection
    Sidebar.tsx(+css)  shell: header + keyboard Explore/Bulletin tabs + panels
  panels/
    account/           AccountChip + SignInDialog: DEMO sign-in theater, no authentication or permissions
    bulletin/          read-only upcoming events, independent of layer toggles; Show on map selects a place and returns to Explore
    search/            SearchPanel: lazy building lookup and grouped Buildings, Rooms, Places results
    layers/            LayersPanel: category toggles, sub-type tree, legend; chips on phones
    building-card/     PlaceCard: hours/access/provenance, inside places, directions and corrections; lib/hours.ts computes campus-local status
  indoor/              BuildingView overlay + FloorPlan SVG, typed registry, pure Dijkstra wayfinding and accessible directions for Kendeda; CULC published room finder
  data/indoor/         curated indoor JSON: source credit, levels, vector spaces with door node ids, graph edges, connectors and approximate entrances
  data/places.json     GeoJSON of points of interest  <- edit this to add places
  data/pois/events.json  fictional weekly demo events at seed locations, explicitly labeled demo
  lib/events.ts        pure next/current event windows and English labels in America/New_York
  lib/places.ts        typed access to the data; hides drafts by default and expired one-off events
  lib/search.ts        ranked campus search for places, footprints and rooms with building aliases and highlight ranges
  lib/layerCatalog.ts  the toggleable layers (id, label, color token, sub-types): add a layer or sub-type here
  state/layerFilters.tsx  which layers/sub-types are on, saved in localStorage
  components/Glyph.tsx    line glyph per category (shape differs, works without color)
  styles/              tokens.css (colors, type, spacing) + cims-ui.css (cims-* components): the design system
  pwa/sw.js            service worker template: vite.config.ts fills in the file list and emits /sw.js (offline, T-41)
  styles.css           global layout and map-control skin; each component has its own .css for layout only
```

## How the pieces talk

- **Selection** is the only shared state: `{ kind: "building" | "place" | "room" | "report", id } | null`.
  Read and set it with `useSelection()`. Panels and layers never talk to each other directly.
- **Layers** are modules in `src/map/layers/`. Each default-exports a `MapLayer`
  (`addTo(map, ctx)` returning `{ update?(selection), remove() }`). The host loads them all by itself,
  so adding a layer means adding one file, with no registry or shared file to edit.
  A layer reports clicks with `ctx.select(...)` and reacts to the selection in `update`.
- **Layer filters** (the layer panel) are a second piece of shared state, `useLayerFilters()`. The host
  passes them to every layer through `setFilters(filters)`; a layer hides what is switched off, usually
  with `map.setFilter(id, buildMapFilter(filters))`. Features carry `category` and optional `subtype`
  properties; a category listed in `lib/layerCatalog.ts` becomes a toggle, any other stays always visible.
- **Indoor** opens for registered building and `buildingId:spaceId` room selections inside `.stage`, above the continuously mounted map. Back or Escape clears selection and returns focus to the map; places inside reuse the shared selection. `BuildingDetails` is shared with the sidebar card.
- **Indoor routing** uses `indoor/route.ts`: Euclidean plan units for same level edges, elevator cost 40 and stairs cost 25 per level hop. Step-free routes exclude inaccessible connectors. `BuildingView` routes immediately from its entrance or chosen start when a room or step-free preference changes; `RoomSearch` browses every level in one keyboard accessible combobox; `FloorPlan` draws decorative route legs and fits its camera to the stage or current leg. Add buildings as JSON using the same typed schema and register them in `indoor/registry.ts`; buildings without a graph hide directions. CULC uses `rooms-only` facts with no geometry or routing: 104 sourced entries, five unavailable plan levels, a level browser and room cards. `indoorRooms()` marks these entries `routable: false`; exact room numbers lead global search and resolve through the existing room selection. Unknown levels remain null. Explicit textual floor names in the inventory are normalized to 1, 4 and 5.
- **Panels** are components in `src/panels/<name>/`, mounted in `components/Sidebar.tsx`.

## Where things go

| I want to...                   | Do this                                                                    |
| ------------------------------ | -------------------------------------------------------------------------- |
| Add a building / place         | Add a Feature to `src/data/places.json`                                    |
| Add a category                 | Extend `Category` in `src/types.ts`                                        |
| Add a new map layer            | New file in `src/map/layers/` default-exporting a `MapLayer`; data in `src/data/` |
| Add a new panel                | New folder in `src/panels/<name>/`, mount it in `components/Sidebar.tsx`   |
| Add a toggleable layer / sub-type | Add it to `src/lib/layerCatalog.ts` and give features that `category` (and `subtype`) |
| React to what is selected      | `useSelection()` in a panel, or `update(selection)` in a layer             |
| Add a backend / API            | Create `server/` and proxy `/api` in `vite.config.ts` and nginx            |
| Change tiles or campus bounds  | `src/config.ts` (tiles also in `src/map/baseStyle.ts`)                     |

Stack: Vite, React 18, TypeScript, MapLibre GL JS (free, no API key), OpenStreetMap tiles.

## Deploy

See `deploy/README.md`. Short version: pushing to `main` updates the public site within about a minute.

Curated POI validation and verification use `scripts/data.mjs`; see [the data workflow](data/README.md).

Orgs and events reuse place features with optional `kind` and `event` metadata and the existing `orgs` category filters. `demo` is visible fictional data, restricted to events and organizations; it is never a verified claim. Weekly schedules recur in campus time, including across DST changes. Data loading filters expired events at startup; the bulletin and selected event card refresh their windows every 30 seconds.
