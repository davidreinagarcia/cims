<!-- summary: Indoor screen polish (2026-11-14): concept A on desktop, D on phones, B as the Stack view; what changed, how it was verified, what is left. -->
# Indoor screen

The building screen (`src/indoor/`) after the hackathon polish of 2026-11-14. References:
[`indoor-concept-A-clean-plan`](references/indoor-concept-A-clean-plan.jpg) (desktop),
[`indoor-concept-D-mobile`](references/indoor-concept-D-mobile.jpg) (phones),
[`indoor-concept-C-directory-steps`](references/indoor-concept-C-directory-steps.jpg) (numbered steps only) and
[`indoor-concept-B-exploded-stack`](references/indoor-concept-B-exploded-stack.jpg) (Stack view). Before:
[`indoor-current-2026-11-14`](references/indoor-current-2026-11-14.jpg). After: [`screenshots/indoor/`](screenshots/indoor/INDEX.md).
The mockups' content (room codes, capacities, equipment, times) is invented and was not copied.

## What changed

- **Header (A):** "Back to map", breadcrumb `Campus / <Building> / <Level>`, title in Barlow caps, aliases under it,
  a pill "Search this building" field (examples come from the building's own data) and the Plan | Stack toggle.
- **Hero plan (A):** fills the frame (home view frames the drawn building, the same frame for every level so they
  line up). Square level rail on the left (active = navy), zoom +/−/reset top right, legend of the room types
  present on that level under the plan, "Schematic, not to scale" and a compass bottom right.
  The compass only shows when the data proves orientation (a west and an east entrance with west drawn left:
  Kendeda); CULC has no compass because its data doesn't say where north is.
- **Plan rendering:** flat fills from `--room-*` tokens (service, utility and outdoor use `--paper-2`, `--paper`
  and `--map-campus`; gold is only the selected room), ink walls, stairs and elevator glyphs at the graph's
  connector nodes, entrances as navy dots. Labels show the name plus the real room number only when the data has
  one; they are fitted per zoom (wrapped, shrunk, the number wins when a numbered room is tight, hidden below
  8 px) and step aside from glyphs, so they never spill out of their room.
- **Route (A + C):** dashed `--route` line, gold "You enter here" tag at an entrance start, numbered circles at
  each step from `route.ts` that match the numbered list (steps that coincide at the current zoom share one
  marker, e.g. "2–4"). Clicking a step highlights its stretch and switches to its level. No distances: `route.ts`
  doesn't compute them. `Step.node` (new) says where each step happens.
- **Room card (A):** name, real room number ("Unknown" when there is none), capacity only when the schematic has
  it, demo features and "Free until …" from the room-finder seed under a **Demo data** tag, navy
  **Book this room** (only for bookable demo rooms) and outlined **Report an issue**, then the directions.
  Book opens the existing reservations panel on that room (`src/indoor/handoff.ts`, a 2-line hook in
  `Shell.tsx`, the rooms panel opens on the room with "All rooms here" to widen). Report opens the existing
  report flow prefilled with building, floor and room (report selection id `building|floor|room`).
- **Phones ≤ 767 px (D):** back chevron + title + toggle, search pill, level pills in a row, full-width plan and
  a bottom sheet: peek with the building name and an info button (spaces, start point, building info), the
  room card with Book / Report and "Directions · N steps", which enters a step mode "Step k of N" with Previous /
  Next that highlights that stretch on the plan. Tap the grip to collapse the card.
- **Stack view (B), enabled:** `STACK_VIEW_ENABLED = true` in `StackView.tsx`; `?indoor=stack` opens it directly.
  Every drawn level is a plate in one CSS 3D scene (perspective, `rotateX(55deg) rotateZ(-35deg)`,
  `translateZ` per level); the active level in full colour, the others ink outlines over light paper; labels with
  space counts from the data; click a plate (or its label, or a level button) to make it active. The route draws
  on each plate and a dashed line joins the plates at the connector nodes the route uses. Labels and vertical
  links are flat SVG placed from measured 3D anchors. No transitions at all (so reduced motion is respected),
  no WebGL, no new dependencies.
- Kept: door sticker links (`?in=culc&door=e1-n` focuses the search), room search across levels with `/`,
  keyboard selection of rooms, pan / wheel zoom, Esc, Back to map, building facts, deep links from the rooms
  panel and search (`?select=room:<building>:<space>`), start point change / pick on the plan, step-free routing.

## Verified

- `npx tsc --noEmit` and `npm run build` pass.
- `shoot.mjs` at 1440, 1280, 390 and 360 px for `/?in=kendeda`, `/?in=culc&door=e1-n`, `/?in=kendeda&indoor=stack`,
  a routed Kendeda room in Stack, and a routed CULC room (242): no horizontal overflow, no console errors.
  Two look-and-fix rounds per phase against A, D and B (route framing, label collisions, step markers,
  compact phone card, stack labels and transparency).

## Left / known gaps

- Not screenshotted (the shooter only loads URLs): the phone step mode, the sheet collapse, Book → reservations
  panel and Report → report flow. They were wired and type-checked but only exercised by reading the code.
- Plan pan is one-finger drag plus buttons; there is no pinch zoom on phones (there wasn't before either).
- In the Stack view on phones with the room card open the scene is small; collapse the sheet to see it.
- CULC entrance names say "upper/lower exit", not a direction, so there's no compass there.
