<!-- summary: Accepted: OpenFreeMap vector tiles styled to the survey-map direction (per-ground palette). -->
# ADR-0006: Vector basemap styled to the "survey map" direction

- **Status:** Accepted (2026-11-14): step 1 shipped with T-10, step 2 (OpenFreeMap vector tiles + our palette) in `feat/basemap-palette`
- **Date:** 2026-11-14
- **Deciders:** _TBD_ (Lane A)
- **Related:** [DESIGN-DIRECTION](../design/DESIGN-DIRECTION.md), F-01, F-09; ADR-0003; Risks R-04, R-12

## Context and problem statement

The chosen visual direction needs a paper-colored map with white roads with ink casing, muted parks,
and letter-spaced caps street labels. The current basemap is OSM's standard raster tiles: we can
only desaturate and wash them out, not restyle roads or labels. The public OSM tile server also
discourages app traffic. How do we get a basemap we control?

## Decision drivers

- Full control of colors, line widths and label typography
- Free, no API key, no per-load billing
- Works with MapLibre and our own building layer on top

## Considered options

1. Keep OSM raster, filtered with `raster-saturation` / `raster-brightness-min` / `raster-contrast`
2. Free hosted vector tiles (e.g., OpenFreeMap, OpenMapTiles schema) + our own MapLibre style JSON
3. Self-hosted PMTiles extract of Atlanta + our own style JSON

## Decision outcome

**Proposed:** start with **option 1** as a same-day approximation, then move to **option 2** when
T-12 (layers) lands. Option 3 is the fallback if the hosted tiles are unreliable (R-12).

### Consequences

- 👍 Street labels, road casing and park colors match the reference exactly.
- 👍 Removes the OSM tile-usage-policy concern.
- 👎 We own a style JSON (≈ 200 lines); put it in `src/map/style/`.
- ⚠️ Fonts for map labels must be served as glyph PBFs; check the provider's font list or host our own.
- ⚠️ Our building layer replaces the provider's buildings in the campus area. Filter theirs out there.

## Validation

Screenshot of the pilot area at zoom 16 and 17, side by side with the reference; labels legible at 360 px.
