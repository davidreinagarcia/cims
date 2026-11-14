# Architecture

Single-page web app. No backend yet; everything the map shows lives in `src/data/`.

```
src/
  config.ts            campus center, bounds, tile source (one place to tweak the map)
  types.ts             Category + PlaceProperties
  data/places.json     GeoJSON of points of interest  <- edit this to add places
  lib/places.ts        typed access to the data
  components/
    MapView.tsx        MapLibre map, markers, fly-to on select
    Sidebar.tsx        search + place list + detail card
  App.tsx              holds `selectedId`, wires sidebar and map together
  styles.css           all styling (Georgia Tech navy and gold)
```

## Where things go

| I want to...                   | Do this                                                         |
| ------------------------------ | --------------------------------------------------------------- |
| Add a building / place         | Add a Feature to `src/data/places.json`                         |
| Add a category                 | Extend `Category` in `src/types.ts`                             |
| Add a new map layer (paths...) | New source + layer in `MapView.tsx`, data in `src/data/`        |
| Add a new panel or page        | New component in `src/components/`, mount it in `App.tsx`       |
| Add a backend / API            | Create `server/` and proxy `/api` in `vite.config.ts` and nginx |
| Change tiles or campus bounds  | `src/config.ts`                                                 |

Stack: Vite, React 18, TypeScript, MapLibre GL JS (free, no API key), OpenStreetMap tiles.

## Deploy

See `deploy/README.md`. Short version: pushing to `main` updates the public site within about a minute.
