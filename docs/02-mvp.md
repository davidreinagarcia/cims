<!-- summary: MVP hypothesis, feature catalogue F-01…F-20 with MoSCoW, boundaries, demo script. -->
# MVP Definition

## MVP hypothesis

> If students can **click any building, toggle the resources they care about, and see a mall-style
> directory inside**, they will find places faster **and** discover resources and organizations they
> didn't know existed.

The MVP must prove both halves of the primary HMW, **navigation** and **discovery**, and show that
the same map is the natural place to **report** (P2) and **find a room** (P3). See
[Problem Statement](01-problem-statement.md) for the three prompts.

> ✅ **Decided 2026-11-14 (Q6):** CIMS is entered **formally in all three prompts**. F-10 Report an issue
> and **F-11 Room finder are Must**; F-18 No-show release moves up to *Should* because P3 names no-shows.

## Guiding principles

1. **Depth over breadth.** One pilot area and one or two buildings done well beat the whole campus done badly.
2. **Real, verified data.** Every POI in the demo is checked against an official source.
3. **Mobile-first.** Students will open this while walking.
4. **Demo-driven.** Each feature has to show up in the 3-minute demo script, or it waits.

## Feature catalogue & MoSCoW

Feature IDs (`F-xx`) are used across the PRD, roadmap and risk register. Origins point back to the
[Miro board](brainstorm/miro-board.md).

### Must have (MVP)

| ID | Feature | Gap | Origin on board |
|----|---------|-----|-----------------|
| F-01 | **Campus base map** with 3D/isometric buildings, pan/zoom/tilt, **clickable buildings** | G1 | Main Map → 3d model of GT → Isometric view, Clickable buildings |
| F-02 | **Layer toggles + legend** (POI categories, Orgs & Events, Transport) | G1, G3 | UI → In map → Toggle/key for layers, POI key/filter |
| F-03 | **Building card**: first click highlights + opens a card (photo, hours, BuzzCard access, what's inside); second click enters the building | G1, G2 | Building Access → Open times, Buzz card access; In building → first/second click |
| F-04 | **Search** across buildings, rooms, POIs and orgs | G1 | *(implied, needed for the "find a room" journey)* |
| F-05 | **POI layers**: Food (dining halls + menu link, restaurants + Dining Dollars flag, coffee, vending), Support desks, Makerspaces, Exercise | G3 | POI → Food / Support / Makerspace / Exercise |
| F-06 | **Indoor directory** for 1–2 pilot buildings: level selector, mall-style directory (classrooms, study rooms, offices, restrooms, vending, lockers), selected room highlighted on the floor plan | G2 | In building → directory, breakdown per level, floor plans |
| F-07 | **Orgs & Events layer**: org/event pins by location, read-only bulletin list (seeded) with "show on map" | G4 | Events → Clubs, Campus Orgs, Community, Admin; Tabs → Bulletin Board |
| F-10 | **Report an issue** *(P2)*: report pinned to building / room / equipment; category picks the right team (Facilities vs. IT); nearby duplicates shown first with **+1**; public status (Open → Routed → In progress → Resolved) | G5 | Maintenance Form / report something → status, pooling duplicates, type filter |
| F-11 | **Room finder** *(P3)*: "Available now / at time X" filter by location, capacity and features (whiteboard, screen, outlets); free rooms highlighted on map + floor plan; **Book** deep-links to the system that owns that room, with its policy summarized | G6 | reserve a room → floor plan highlight |

### Should have (if MVP is done before M2)

| ID | Feature | Origin |
|----|---------|--------|
| F-08 | **Study-space fullness self-report** (1-tap: empty / some / full) + color on map | Study spaces / density |
| F-18 | **No-show release** *(P3)*: check-in at the room (QR/NFC) within 10–15 min or the booking is released and shown as free | P3 prompt; NFC tag inside building |
| F-09 | **Transport layer**: bus/Stingerette stops, bike parking, key walkways | Transport |

### Could have (roadmap / pitch slide)

| ID | Feature | Origin |
|----|---------|--------|
| F-19 | Locker reservation | Also system to reserve a locker |
| F-20 | Unified booking (book inside CIMS across systems) and real ticket integration with Facilities/IT | P2 + P3 prompts |
| F-12 | Stories / feed, each story tappable to its map location | Stories/feed; Video stories |
| F-13 | Live activity heat map (Waze-style) + study-space density prediction model | Heat map of campus activity; "after data collection complete with a model" |
| F-14 | Indoor path to the selected room | Selected classroom shows a path |
| F-15 | NFC tags inside buildings to open that building's directory | "or NFC tag inside building" |
| F-16 | Street view / VR tour; East vs. West campus guide for prospective & international students | Street view/possible VR |
| F-17 | Dining hall capacity & daily food reviews | capacity / daily food review |

### Won't have (this hackathon)

- Real bookings or real ticket submission into Facilities/IT systems (we deep-link / simulate routing)
- Payments or GT SSO integration
- Native iOS/Android apps
- Full campus indoor coverage
- Moderation tooling for user-generated content (beyond a hard-coded allowlist)

## MVP boundaries

| Dimension | MVP boundary |
|-----------|--------------|
| Geography | **Whole campus** footprints in 3D (decided); curated names/heights first around the pilot building |
| Indoor | **Kendeda Building** (decided); **CULC** second if time allows |
| Data | Hand-curated seed (`data/`), each record with `source_url` + `verified_at` |
| Users | Anonymous; no accounts |
| Reports (F-10) | Stored in CIMS; routing to Facilities vs. IT is **simulated** (shown, not sent) |
| Room availability (F-11) | Seeded / mocked schedule for pilot-building rooms unless a real feed is available (Q7) |
| Platforms | Modern mobile + desktop browsers |

## Demo script (3 minutes, draft)

1. **Hook (20 s):** "It's your first week. Your class is in Kendeda `<room>`. Where is it?"
2. **Find a building (30 s):** search "Kendeda" → building highlights in 3D → card shows hours, BuzzCard access.
3. **Find a room (40 s):** enter building → choose floor → the room highlighted in the directory.
4. **Discover (50 s):** toggle Food → the nearest coffee/dining from the building; toggle Support → the
   nearest help desk; toggle Makerspaces → the closest one (all from verified POI data).
5. **Community (25 s):** Orgs & Events layer → a club meeting tonight two buildings away → tap → map.
6. **Report it (25 s, P2):** in that room the projector is broken → "Report" → category *Classroom tech*
   → shows "routed to IT" → an existing report is already there → **+1** → status visible.
7. **Find a room (20 s, P3):** "Available now, 4+ people, whiteboard" → two free rooms light up on the
   same floor → **Book** opens the owning system.
8. **Vision (10 s):** roadmap slide: no-show release, real ticket integration, density, VR.

> Timing is now ~3:30. Trim steps 4–5 if the slot is strictly 3 minutes. Room numbers are filled in
> from the real Kendeda floor data (T-20); never invent them for the demo.

## MVP exit criteria

- All **Must** features meet the acceptance criteria in the [PRD](03-prd.md).
- Demo script runs 3× in a row on the demo device without errors.
- Every item in the [Definition of Done](07-definition-of-done.md) release checklist is satisfied.
