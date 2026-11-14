<!-- summary: Personas, user stories with Given/When/Then acceptance criteria per feature, NFRs, open questions. -->
# Product Requirements Document (PRD)

| Field | Value |
|-------|-------|
| Product | **CIMS** — Campus Interactive Map System |
| Owner | Product Lead (_TBD_) |
| Version | 0.1 (draft), 2026-11-14 |
| Related | [Charter](00-project-charter.md) · [Problem](01-problem-statement.md) · [MVP](02-mvp.md) · [Architecture](04-architecture.md) |

## 1. Goals & non-goals

**Goals**
- Make finding a building, and a room inside it, a task of under a minute.
- Surface resources (food, support, makerspaces, study space) and organizations *by place*.
- Bring fragmented campus info into one map without needing official API access.

**Non-goals**
- Replacing official systems (dining, booking, org registry, Facilities/IT ticketing). We **link** to
  them; for reports we *simulate* routing in the MVP and pitch real integration as the next step.
- Turn-by-turn outdoor navigation. We hand off to the phone's maps app.

## 2. Personas

| Persona | Snapshot | Top job-to-be-done |
|---------|----------|--------------------|
| **Ana, first-year** | Week 1, doesn't know building nicknames | "Get me to CULC 152 on time." |
| **Luis, transfer** | Junior, skipped most of orientation | "What resources exist that everyone else already knows about?" |
| **Mei, international admit** | Still abroad, arriving in August | "Show me what campus looks like and which side I'll live on." |
| **Sam, current student** | Needs a quiet spot between classes | "Where can I study *right now* that isn't packed?" |
| **Priya, club officer** | Runs recruitment for a club | "Get our meeting in front of students nearby." |
| **Visitor / parent** | On campus for a tour | "Where's the visitor center and where can I eat?" |
| **Diego, any student** *(P2)* | Notices a broken projector in class | "Report this in 10 seconds and know it isn't ignored." |
| **Study group of 4** *(P3)* | Needs a room with a whiteboard in 20 min | "Show me what's free near me right now." |
| **Facilities / IT staff** *(P2, secondary)* | Receives reports | "Tell me exactly where, what, and how many people it affects." |

## 3. User stories & acceptance criteria

Priority follows the [MVP](02-mvp.md) MoSCoW. Acceptance criteria use **Given / When / Then**.
Story IDs: `US-<feature>.<n>`.

---

### F-01 Campus base map — **Must**

**US-01.1** As a **new student**, I want to see campus as a 3D/isometric map so that I can recognize
buildings by shape and position.
- **Given** I open the app, **when** it loads, **then** the pilot area is centered with buildings extruded in 3D and labeled.
- **Given** the map is loaded, **when** I pinch/scroll/drag, **then** I can zoom, pan, and tilt/rotate smoothly (≥ 30 fps on a mid-range phone).
- **Given** I deny location permission, **then** the app still works fully, with no blocking prompt.
- OpenStreetMap attribution is visible at all times.

**US-01.2** As a **student**, I want to tap a building so that I can learn what it is.
- **Given** the map, **when** I tap a building, **then** it highlights and its building card opens (see F-03).
- **Given** a building is highlighted, **when** I tap empty map, **then** the highlight clears and the card closes.

### F-02 Layer toggles + legend — **Must**

**US-02.1** As a **student**, I want to turn categories on and off so that I only see what I care about.
- **Given** the layer panel, **when** I toggle a layer (Food, Support, Makerspaces, Exercise, Orgs & Events, Transport), **then** its pins appear/disappear within 200 ms.
- **Given** a layer has sub-types (e.g., Food → Dining halls, Restaurants, Coffee, Vending), **when** I expand it, **then** I can filter by sub-type.
- **Given** any layer is on, **then** the legend shows its icon and color; icons are distinguishable without color (shape/glyph).
- Layer state persists across reloads on the same device.

### F-03 Building card — **Must**

**US-03.1** As a **student**, I want to see a building's hours and access rules so that I know whether I can get in.
- **Given** I tap a building, **then** the card shows: name + common nickname, photo, address, today's hours with **Open/Closed now** status, BuzzCard access requirement (and hours if different), and a list of notable POIs inside.
- **Given** data is missing for a field, **then** the field shows "Unknown" (never a guess) and a "Suggest a correction" link.
- **Given** the card is open, **when** I tap "Directions", **then** the device's maps app opens with the building's entrance coordinates.
- **Given** the building has an indoor directory, **then** an **Enter building** button is shown (second tap behavior from the board).

### F-04 Search — **Must**

**US-04.1** As a **student**, I want to search by name, nickname, or room number so that I can jump straight to a place.
- **Given** I type ≥ 2 characters, **then** results appear as I type (≤ 150 ms), grouped by Buildings / Rooms / Places / Orgs.
- **Given** I search a nickname (e.g., "CULC", "Student Center"), **then** the right building is the first result.
- **Given** I search "CULC 152" (building + room), **then** selecting the result opens the building's indoor view on the right floor with the room highlighted.
- **Given** no results, **then** I see "No results" plus a suggestion (e.g., check spelling, browse layers).

### F-05 POI layers — **Must**

**US-05.1** As a **hungry student**, I want to see food options near me so that I can choose where to eat.
- **Given** Food is on, **then** dining halls, restaurants, coffee shops and vending machines show with distinct icons.
- **Given** I tap a dining hall, **then** I see hours, open-now status, and a **link to today's menu** (official site).
- **Given** I tap a restaurant, **then** I see whether it accepts **Dining Dollars (yes/no)**.

**US-05.2** As a **transfer student**, I want to see support desks so that I know where to get help.
- **Given** Support is on, **then** IT/tech desks, housing offices, info desks, and safety/transit/financial desks are shown (seed list in [brainstorm](brainstorm/miro-board.md)).
- **Given** I tap a desk, **then** I see what it helps with, location detail (building + floor/suite), hours, and source link.

**US-05.3** As a **maker**, I want to see makerspaces so that I can find tools for my project.
- **Given** Makerspaces is on, **then** each space shows focus/equipment summary, location, and official link.

**Data rule (all POIs):** every record has `source_url` and `verified_at`; records older than 90 days show a "may be outdated" hint.

### F-06 Indoor directory — **Must** (pilot buildings only)

**US-06.1** As a **first-year**, I want a floor-by-floor directory of a building so that I can find my classroom.
- **Given** I tap **Enter building**, **then** I see a level selector (defaulting to the entrance level) and the floor plan for that level.
- **Given** a floor, **then** a directory lists rooms by type: classrooms, study rooms, offices, restrooms, vending, lockers, with search/filter.
- **Given** I select a room (from directory or search), **then** it's highlighted on the floor plan and the plan pans to it.
- **Given** a non-pilot building, **then** "Enter building" isn't shown; the card says "Indoor map coming soon".

### F-07 Orgs & Events layer — **Must**

**US-07.1** As a **student looking for community**, I want to see orgs and events by location so that I can find something to join nearby.
- **Given** Orgs & Events is on, **then** pins show for events (with date/time) and org home bases, filterable by type: Clubs, Campus Orgs, Community, Admin.
- **Given** I open the Bulletin tab, **then** I see a list of upcoming posts sorted by start time; each has **Show on map**.
- **Given** I tap **Show on map**, **then** the map flies to the location and opens the post.
- **Given** an event has ended, **then** it's hidden from the map and list.

**US-07.2** As a **club officer**, I want to post an event so that students nearby see it. *(MVP: seeded by the team; posting UI is Should.)*

---

### F-08 Study-space fullness — **Should**

**US-08.1** As a **student**, I want to see how full study spaces are so that I don't walk to a packed one.
- **Given** Study spaces is on, **then** each space is colored by recent reports (empty / some / full) with "last updated N min ago".
- **Given** I'm viewing a study space, **when** I tap one of three buttons, **then** my report is saved anonymously in 1 tap; I can't report the same space again within 15 min.
- **Given** no reports in the last 2 h, **then** the space shows "No recent data" (gray), never a stale color.

### F-09 Transport layer — **Should**

**US-09.1** As a **student**, I want to see bus/Stingerette stops and bike parking so that I can plan how to get around.
- **Given** Transport is on, **then** stops, routes (static), and bike parking show; tapping a stop links to the official live-tracking page.

### F-10 Report an issue — **Must** *(P2 Campus Maintenance; proposed v0.2)*

**US-10.1** As a **student**, I want to report a problem *where it is* so that I don't have to figure
out which system or team handles it.
- **Given** I'm on the map, in a building, or on a room, **when** I tap **Report**, **then** the
  location (building → floor → room, or a map pin outdoors) is prefilled.
- **Given** the form, **then** I pick a category: *Classroom tech* (projector, display, mic),
  *Network / Wi-Fi*, *Electrical / lighting*, *Plumbing / restroom*, *HVAC / temperature*,
  *Furniture*, *Accessibility* (elevator, door, ramp), *Cleanliness*, *Safety hazard*, *Other*; I can
  optionally name the **equipment** (e.g., "Projector, front left") and add a description + photo.
- **Given** a category, **then** the form shows **which team it routes to** (Facilities or IT) before
  I submit. MVP: routing is **simulated**, shown but not sent (see Non-goals).
- **Given** *Safety hazard*, **then** a banner shows the official emergency contact before the form.
- **Given** I submit, **then** I see a confirmation with a shareable status link, in ≤ 3 taps total
  for a prefilled location.

**US-10.2** As a **student**, I want to see whether someone already reported the same problem so that I
add my voice instead of filing a duplicate.
- **Given** open reports exist for the **same room** (or within 25 m outdoors) and the **same
  category**, **when** I start a report, **then** they're shown first with a **+1 / "Me too"** button.
- **Given** I tap +1, **then** the report's count increments; one +1 per client per report.
- **Given** a report has N +1s, **then** it's ranked higher in the team's view (impact signal).

**US-10.3** As a **student**, I want to track the status of reports so that I know whether a problem is
being handled.
- **Given** a report, **then** its status is one of **Open → Routed → In progress → Resolved**
  (or *Closed – duplicate*), with timestamps.
- **Given** the Reports layer is on, **then** open reports show as pins filterable by category and
  status; resolved ones disappear after 7 days.
- **Given** a building card, **then** it shows a count of open reports ("2 open issues").

**US-10.4** As a **Facilities / IT staff member** *(demo persona)*, I want a queue of reports by team
and location so that I can act on them.
- **Given** the staff view (unlisted URL in MVP), **then** I see reports routed to my team, grouped
  by building and sorted by +1 count, and I can change status.

### F-11 Room finder — **Should** *(P3 Improved Room Reservations; proposed v0.2)*

**US-11.1** As a **student who needs a room on short notice**, I want to see which rooms are free right
now so that I don't check several booking systems one by one.
- **Given** the Rooms tab, **when** I pick **Available now** (default) or a time window, **then** free
  bookable rooms are highlighted on the map (building level) and on the floor plan (room level).
- **Given** filters, **then** I can filter by **location** (building / near me), **capacity**
  (≥ N people) and **features** (whiteboard, screen/display, outlets, accessible, quiet).
- **Given** a room, **then** its card shows capacity, features, the **system that owns it** and a
  one-line policy summary (who can book, max duration, how far ahead).
- **Given** I tap **Book**, **then** the owning system opens via deep link (MVP: we don't book inside CIMS).
- **Given** availability data is seeded/mocked, **then** the UI labels it "Demo data".

### F-12 – F-20 — **Could**

Tracked in the [Roadmap](05-roadmap.md); stories will be written when promoted.

## 4. Non-functional requirements

| Area | Requirement |
|------|-------------|
| Performance | Time to interactive ≤ 3 s on 4G mid-range phone; map interactions ≥ 30 fps |
| Accessibility | WCAG 2.1 AA for all non-map UI; every map feature also reachable via search/list; color is never the only signal |
| Responsiveness | 360 px phone width to desktop; no horizontal scroll |
| Privacy | No accounts in MVP; no location stored server-side; crowd reports anonymous and rate-limited |
| Data quality | `source_url` + `verified_at` on every record; "Unknown" over guesses |
| Availability | Demo URL up during judging; offline fallback for the demo (cached build + data) |
| Security | No secrets in repo; write endpoints rate-limited; user content escaped |
| Legal | OSM attribution; no official logos without permission; floor plans only from public/permitted sources |

## 5. Analytics (demo-level)

Track anonymously: searches (term category, result clicked y/n), layers toggled, building cards
opened, "Enter building" used, rooms found. That's enough to back the "discovery" claim in the pitch.

## 6. Open questions

| # | Question | Owner | Due |
|---|----------|-------|-----|
| Q1 | Hackathon dates, deliverables and judging criteria? | Product Lead | M0 |
| Q2 | Can we get pilot-building floor plans, and are we allowed to publish them? | Data & Content | M0 |
| Q3 | Pilot area and pilot building(s): central campus + CULC? | Team | M0 |
| Q4 | Is there an official GT data source (GIS, building list) we can use? | Tech Lead | M1 |
| Q5 | Do we pitch a path to SGA/Facilities ownership after the hackathon? | Product Lead | M3 |
| Q6 | Do we formally submit to P2/P3 as well, or only P1 with P2/P3 as integrated features? Confirms F-10 Must / F-11 Should | Product Lead | M0 |
| Q7 | Is there any public room-availability feed, or do we mock availability for the pilot building? | Tech Lead | M1 |
| Q8 | Which Facilities vs. IT categories match GT's real routing? (validate with staff if possible) | Data & Content | M1 |

## 7. Changelog

| Date | Version | Change | By |
|------|---------|--------|----|
| 2026-11-14 | 0.1 | Initial draft from Miro brainstorm | _TBD_ |
| 2026-11-14 | 0.2 | Project named **CIMS**. Integrated SGA prompts P2 (Campus Maintenance) and P3 (Improved Room Reservations): F-10 → Must (expanded), F-11 Room finder → Should, F-18 to F-20 added. Pending confirmation (Q6) | _TBD_ |
