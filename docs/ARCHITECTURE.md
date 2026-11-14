<!-- summary: Code layout: where each kind of code and data goes in src/. -->
# Architecture

Single-page web app. No backend yet; everything the map shows lives in `src/data/`.

```
src/
  App.tsx              shell: SelectionProvider + sidebar + map
  config.ts            campus center, bounds, tile source (one place to tweak the map)
  types.ts             Category + PlaceProperties
  state/selection.tsx  Selection {kind, id}, SelectionProvider, useSelection()
  map/
    types.ts           the layer contract (MapLayer, LayerHandle, LayerContext, LayerFilters)
    pins.ts            draws the survey pins (teardrop + category glyph) on a canvas and registers them with the map
    layerFilters.ts    LayerFilters to a MapLibre filter (`buildMapFilter`) and `isVisible`
    baseStyle.ts       base style (OSM raster tiles + glyphs); swap for a vector basemap here
    loadLayers.ts      finds every file in layers/ automatically (import.meta.glob)
    layers/
      pois.ts          places: filtered clusters and shared-location picker, survey pins/labels, independent gold selection
  components/
    MapView.tsx        host: creates the map, loads layers, passes them the selection
    Sidebar.tsx(+css)  shell: header + panels
  panels/
    search/            SearchPanel: search box + list
    layers/            LayersPanel: category toggles, sub-type tree, legend; chips on phones
    building-card/     PlaceCard: hours/access/provenance, inside places, directions and corrections; lib/hours.ts computes campus-local status
  data/places.json     GeoJSON of points of interest  <- edit this to add places
  lib/places.ts        typed access to the data
  lib/search.ts        pure ranked place search with aliases, accent folding and highlight ranges
  lib/layerCatalog.ts  the toggleable layers (id, label, color token, sub-types): add a layer or sub-type here
  state/layerFilters.tsx  which layers/sub-types are on, saved in localStorage
  components/Glyph.tsx    line glyph per category (shape differs, works without color)
  styles/              tokens.css (colors, type, spacing) + cims-ui.css (cims-* components): the design system
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
