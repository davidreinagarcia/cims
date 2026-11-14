<!-- summary: Why the project exists, objectives, scope, stakeholders, success criteria, governance. -->
# Project Charter — CIMS

| Field | Value |
|-------|-------|
| Project | **CIMS** — Campus Interactive Map System |
| Context | SGA Campus Solutions Hackathon, Georgia Tech. Primary prompt: *Smarter Campus Map*; integrated: *Campus Maintenance*, *Improved Room Reservations* |
| Sponsor / audience | Student Government Association (challenge owner), hackathon judges |
| Product Lead | _TBD_ |
| Tech Lead | _TBD_ |
| Charter version | 0.1 (draft), 2026-11-14 |
| Status | Draft, to be ratified at M0 Kickoff |

## 1. Purpose

Give Georgia Tech students one place to **find and discover** campus spaces, resources and student
organizations, outdoors (which building, which entrance) and indoors (which floor, which room), and use
that same map to **report issues** where they happen and **find rooms** that are free.

## 2. Background

The SGA challenge notes that campus information is fragmented across separate systems, and that
wayfinding fails at the last step, inside the building. The team's brainstorm
([Miro transcription](brainstorm/miro-board.md)) produced two trees: a **Main Map** with data layers,
and a **UI / dashboard** with interactions. This charter turns that brainstorm into a scoped project.

## 3. Objectives

| # | Objective | Measure |
|---|-----------|---------|
| O1 | A student can find any building in the pilot area and see what's inside, with hours and access | Task success in a hallway test (see §6) |
| O2 | A student can find a specific room in a pilot building, on the right floor | Room found with no outside help |
| O3 | A student can discover resources they didn't know about (food, support desks, makerspaces) | Count of resources a tester didn't know before |
| O4 | A student can discover organizations and events by where they happen | Org/event reachable from the map in ≤ 3 taps |
| O5 | A student can report an issue tied to a building/room/equipment and see its status (P2) | Report filed in ≤ 3 taps from a room; duplicate surfaced |
| O6 | A student can find a room free *now* that fits their group (P3) | Free room found with filters in < 30 s |
| O7 | Deliver a working, live demo and a credible path beyond the hackathon | Demo runs end-to-end; roadmap presented |

## 4. Scope

**In scope (MVP):** campus base map with clickable buildings; layer toggles and legend; building info
cards; search; POI layers (Food, Support, Makerspaces, Exercise); indoor directory for **1–2 pilot
buildings**; orgs & events layer; **issue reporting with status and duplicates** (P2). Should: **room
finder** (P3). Details in [MVP](02-mvp.md).

**Out of scope (for the hackathon):** real room and locker booking (deep links only); real submission
of tickets into Facilities/IT systems (routing is simulated); production-grade
crowdsourced density with a predictive model; VR / street view; NFC tags; turn-by-turn indoor routing;
native mobile apps; integration with GT authentication (SSO).

## 5. Stakeholders

| Stakeholder | Interest | Engagement |
|-------------|----------|------------|
| Students (first-year, transfer, international, grad) | Find places, discover orgs | Primary users; hallway tests |
| Prospective students & visitors | Orientation before/at first visit | Secondary users |
| Student organizations | Visibility, recruitment | Content providers (bulletin) |
| SGA | Challenge owner | Judges / feedback |
| Facilities, Housing, OIT, Dining | Accurate info; fewer "where is X" questions; better-located, deduplicated reports | Data sources; recipients of F-10 reports (simulated in MVP) |
| Room-booking owners (library, departments, student center) | Fewer no-shows, better utilization | Deep-link targets for F-11 |
| Hackathon judges | Impact, feasibility, execution, demo | Final pitch |

## 6. Success criteria

- [ ] Live demo covers the core journeys end-to-end without fallbacks: *find a building*,
      *find a room*, *discover an org/resource*, *report an issue* (+ *find a free room* if F-11 ships).
- [ ] ≥ 5 hallway testers (not on the team) complete each journey; ≥ 80% task success.
- [ ] Every POI shown in the demo is **verified** against an official GT source (`verified_at` set).
- [ ] Runs on a phone browser (≤ 3 s to interactive on 4G) and on a laptop.
- [ ] Submission is on time with repo, README, and pitch deck.

## 7. Constraints & assumptions

- **Time:** hackathon timeframe (dates _TBD_). Every scope decision favors a *working demo*
  over breadth.
- **Budget:** $0. Free tiers and open data only.
- **Data:** no official API access assumed. Data is hand-curated, sourced from public GT pages and
  OpenStreetMap. Floor plans: only what's publicly available or explicitly provided (see Risk R-03).
- **Branding:** no official GT/SGA logos or marks without permission (see Risk R-07).
- **Assumption:** judges value a polished narrow demo over a broad shallow one.

## 8. Milestones (summary)

M0 Kickoff & scope lock → M1 Map foundation & data → M2 MVP feature-complete → M3 Polish & demo
freeze → M4 Submission & pitch. Full detail: [Roadmap](05-roadmap.md).

## 9. Governance

- Decisions: Product Lead owns **what**, Tech Lead owns **how**; ties go to a quick team vote.
  Technical decisions are recorded as [ADRs](adr/README.md).
- Cadence: daily 10-min stand-up; checkpoint at every milestone ([meeting notes template](../templates/meeting-notes.md)).
- Scope changes after M0 need Product Lead approval and a note in the PRD changelog.

## 10. Approval

| Name | Role | Date | ✔ |
|------|------|------|---|
| _TBD_ | Product Lead | | |
| _TBD_ | Tech Lead | | |
| _TBD_ | Team | | |
