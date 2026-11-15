<!-- summary: Map-first app shell (Google Maps-like): thin left rail, floating search pill and POI chips, floating cards; mobile tab bar + bottom sheet. Supersedes the fixed sidebar. -->
# App shell: map first

> **Status:** Decided by Tato, 2026-11-14. Supersedes the fixed 340px sidebar with the navy header.
> **Why:** the sidebar takes a third of the screen and steers the experience. The map is the product;
> everything else floats over it and gets out of the way.
> **References:** [`shell-gmaps-desktop-annotated`](references/shell-gmaps-desktop-annotated.webp) and
> [`shell-gmaps-mobile-annotated`](references/shell-gmaps-mobile-annotated.webp) (Google Maps, annotated by
> Tato: red = rail / tab bar, green = search, blue = chips, black = account) · inspiration:
> [`shell-inspo-01`](references/shell-inspo-01.webp). Copy the **structure**, keep **our identity**
> (survey map, navy/gold, Barlow caps, glyph shapes). Don't copy Google's look.

## Desktop (≥ 768px)

```
┌──────┬───────────────────────────────────────────────────────────────┐
│ ☰    │ [ CIMS │ Search buildings, rooms…  🔍 │ ⤴ ]  (Food)(Support)(…) ›   (avatar)│
│      │ ┌───────────────┐                                              │
│ 🔍   │ │ floating card │            full-bleed map                    │
│Explore│ │ (results,     │                                              │
│ ▦    │ │  building,    │                                     [⌖]      │
│Rooms │ │  room finder, │                                     [+]      │
│ ⚠    │ │  report…)     │                                     [−]      │
│Report│ └───────────────┘                                     [2D]     │
│ ✉    │                                                     scale·lat/lng│
│Bulletin│ [Layers tile]  N                                                │
└──────┴───────────────────────────────────────────────────────────────┘
```

1. **Left rail** (red), 72px wide, full height, paper background, 1px right border:
   ☰ menu on top, then icon + small label buttons: **Explore**, **Rooms**, **Report**, **Bulletin**.
   The active item gets a rounded pill highlight behind its icon (navy outline, paper-2 fill).
   The rail replaces the Explore/Bulletin tabs. ☰ opens a slim drawer: About, Sign in/out, Data corrections.
2. **Search pill** (green), floating top-left next to the rail, ~400px: small `CIMS` wordmark (text only,
   no GT logo), input, search button, and a **Route** button (opens David's From/To directions box).
   Suggestions drop down from the pill itself.
3. **Category chips** (blue), one floating row to the right of the pill, horizontally scrollable with a
   › arrow: Food, Support, Makerspaces, Exercise, Orgs & Events, Transport, Printing, Health. Each chip
   = category glyph (its color) + label; pressed = navy fill, white/gold label. Chips are the quick
   layer toggles. Full legend + sub-filters live in the **Layers** popover.
4. **Account** (black), top-right: the avatar/AccountChip as a 40px circle. Nothing else up there.
5. **Floating card** (the content area): opens under the search pill when there's something to show
   (search results, place/building card, room finder, report flow, bulletin). Width 400px, max height
   = viewport − top bar − 24px, scrolls inside, collapse chevron (‹) on its right edge, Esc closes.
   When nothing is selected **there is no card**: the map is fully visible.
6. **Layers tile**, bottom-left of the map (like Google's), opens the legend popover (the current
   LayersPanel content: categories, sub-filters, counts). Not permanently on screen.
7. **Map controls**, bottom-right, stacked: locate, zoom +/−, 2D/3D, compass; scale + lat/lng box under them.
   North arrow stays bottom-left next to the Layers tile.
8. **Indoor (BuildingView)** keeps working; it opens as the floating card's content or its own large
   floating panel. It must not cover the rail or the search pill.

## Mobile (< 768px)

```
┌───────────────────────────┐
│ [🔍 Search CIMS…   (av)] │  ← floating search pill with avatar inside
│ (Food)(Support)(Maker)… → │  ← chips row, scrolls
│                           │
│        full-bleed map     │
│                     [⌖]  │
│                     [⤴]  │  ← Route FAB (navy, gold icon)
│ ┌───────────────────────┐ │
│ │ bottom sheet (peek)   │ │  ← results / cards, 3 snaps: peek · half · full
│ └───────────────────────┘ │
│ Explore  Rooms  Report  Bulletin │  ← tab bar (replaces the rail)
└───────────────────────────┘
```

- Search pill at the top with the avatar inside on the right (green).
- Chips row right below it (blue), scrolls horizontally, no wrapping.
- **Bottom tab bar** (red): Explore · Rooms · Report · Bulletin, icon + label, active = pill highlight.
  Respect `env(safe-area-inset-bottom)`.
- **Bottom sheet** above the tab bar for all content: peek (handle + title), half, full; drag or tap
  the handle. Empty state = no sheet.
- **Route FAB** bottom-right above the sheet; locate button above it. Zoom buttons hidden (pinch).
- Nothing may overlap the search pill or the tab bar. 44px minimum tap targets.

## Visual rules for floating UI ("modern, not blocky")

These **update** DESIGN-DIRECTION for floating surfaces only:

| Thing | Rule |
|-------|------|
| Pills (search, chips, FAB, tab highlight) | `border-radius: 999px` |
| Floating cards, popovers, bottom sheet | `border-radius: 16px` (sheet: top corners only) |
| Inside cards (rows, tables, inputs) | keep square/hairline survey style |
| Separation from the map | white/paper fill + 1px border `--hairline-muted`. If a surface doesn't separate from a busy map in the screenshot test, add `--elev` (below), never a blurred drop shadow |
| `--elev` | `0 1px 0 rgba(28, 39, 51, 0.28)`: a 1px letterpress line under the surface, no blur |
| Header | the navy header bar and 340px sidebar are removed; navy appears in pressed chips, active states, primary buttons |
| Motion | card/sheet open = one 150ms slide; respect `prefers-reduced-motion` |

Tokens to add in `src/styles/tokens.css`: `--radius-pill: 999px; --radius-card: 16px; --elev: 0 1px 0 rgba(28, 39, 51, 0.28); --rail-w: 72px; --tabbar-h: 64px;`.

## What must not change

Panel internals and behavior: search ranking/suggestions/directions (David's `feat/search-gmaps`),
building/place cards, room finder, report flow, bulletin, indoor viewer, layer filter state, map layers,
pins, basemap. The shell only changes **where** they're mounted and their outer container.
