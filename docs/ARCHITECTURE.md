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
    types.ts           the layer contract (MapLayer, LayerHandle, LayerContext)
    baseStyle.ts       base style (OSM raster tiles + glyphs); swap for a vector basemap here
    loadLayers.ts      finds every file in layers/ automatically (import.meta.glob)
    layers/
      pois.ts          places: markers, labels, highlight and fly-to on select
  components/
    MapView.tsx        host: creates the map, loads layers, passes them the selection
    Sidebar.tsx(+css)  shell: header + panels
  panels/
    search/            SearchPanel: search box + list
    building-card/     PlaceCard: detail of the selected thing (becomes the building card, T-11)
  data/places.json     GeoJSON of points of interest  <- edit this to add places
  lib/places.ts        typed access to the data
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
- **Panels** are components in `src/panels/<name>/`, mounted in `components/Sidebar.tsx`.

## Where things go

| I want to...                   | Do this                                                                    |
| ------------------------------ | -------------------------------------------------------------------------- |
| Add a building / place         | Add a Feature to `src/data/places.json`                                    |
| Add a category                 | Extend `Category` in `src/types.ts`                                        |
| Add a new map layer            | New file in `src/map/layers/` default-exporting a `MapLayer`; data in `src/data/` |
| Add a new panel                | New folder in `src/panels/<name>/`, mount it in `components/Sidebar.tsx`   |
| React to what is selected      | `useSelection()` in a panel, or `update(selection)` in a layer             |
| Add a backend / API            | Create `server/` and proxy `/api` in `vite.config.ts` and nginx            |
| Change tiles or campus bounds  | `src/config.ts` (tiles also in `src/map/baseStyle.ts`)                     |

Stack: Vite, React 18, TypeScript, MapLibre GL JS (free, no API key), OpenStreetMap tiles.

## Deploy

See `deploy/README.md`. Short version: pushing to `main` updates the public site within about a minute.
