# Team Roles & RACI

## Roles

One person can hold more than one role. Every role needs exactly one owner.

| Role | Owner | Responsibilities |
|------|-------|------------------|
| **Product Lead** | _TBD_ | Owns the *what*: scope, priorities, PRD, demo narrative, judging criteria; final say on scope changes |
| **Tech Lead** | _TBD_ | Owns the *how*: architecture, ADRs, repo/CI, code review standards, unblocks the team |
| **Frontend / Map Engineer** | _TBD_ | Map engine, layers, building card, indoor viewer, search UI, performance |
| **Backend / Data Engineer** | _TBD_ | Data schemas, validation, Supabase (Should features), search index |
| **Data & Content Researcher** | _TBD_ | Curates and **verifies** POIs, hours, orgs, floor plans; owns `source_url` / `verified_at` quality |
| **Design / UX** | _TBD_ | Flows, UI kit, icons/legend, accessibility, hallway tests |
| **Pitch & Demo Lead** | _TBD_ | Deck, demo script, backup video, rehearsal, Q&A prep |

## RACI matrix

**R** = Responsible (does the work) · **A** = Accountable (one per row, signs off) ·
**C** = Consulted · **I** = Informed

| Deliverable / Activity | Product | Tech | FE/Map | BE/Data | Content | Design | Pitch |
|------------------------|:-------:|:----:|:------:|:-------:|:-------:|:------:|:-----:|
| Project charter & scope | **A/R** | C | I | I | I | C | C |
| Problem statement & user research | **A** | I | I | I | C | R | C |
| PRD (stories + acceptance criteria) | **A/R** | C | C | C | C | C | I |
| Architecture & ADRs | C | **A/R** | C | C | I | I | I |
| Repo, CI, auto-deploy (Alexandria) | I | **A** | C | R | I | I | I |
| F-01 base map / 3D | I | A | **R** | I | I | C | I |
| F-02 layers & legend | C | A | **R** | I | C | R | I |
| F-03 building card | C | A | **R** | C | C | R | I |
| F-04 search | C | A | R | **R** | I | C | I |
| F-05 POI data & layers | C | A | R | C | **R** | I | I |
| F-06 indoor directory & floor plans | C | A | **R** | C | R | C | I |
| F-07 orgs & events | C | A | R | C | **R** | C | I |
| F-10 report an issue (P2) | C | A | R | **R** | C | R | I |
| F-11 room finder (P3) | C | A | R | **R** | C | C | I |
| Issue category → team routing table | C | I | I | C | **A/R** | I | I |
| F-08 study density | C | A | C | **R** | I | C | I |
| Data verification (`verified_at`) | I | C | I | C | **A/R** | I | I |
| UI kit, accessibility | C | C | R | I | I | **A/R** | I |
| Hallway tests | A | I | C | I | C | **R** | C |
| Demo script & rehearsal | **A** | C | C | C | C | C | **R** |
| Pitch deck | A | C | I | I | C | C | **R** |
| Submission | **A/R** | C | I | I | I | I | C |
| Risk register upkeep | **A** | R | I | I | I | I | I |

## Working agreements

- **Stand-up:** daily, 10 min, three questions: done / next / blocked.
- **Response time:** acknowledge team messages within _TBD_ during hackathon hours.
- **Decisions:** Product Lead decides scope, Tech Lead decides implementation; disagreements get 5
  minutes, then a vote; record outcome in meeting notes or an ADR.
- **Blockers:** anything blocked > 30 min gets raised immediately, not at the next stand-up.
- **Ownership:** each card on the board has exactly one assignee.

## Contacts

| Name | Role(s) | Handle / email | Availability |
|------|---------|----------------|--------------|
| _TBD_ | | | |
