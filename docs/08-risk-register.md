<!-- summary: Risks R-01…R-16 scored L×I with mitigation, contingency and owner. -->
# Risk Register

**Scoring:** Likelihood (L) and Impact (I) on 1–5. **Score = L × I.**
🔴 ≥ 15 · 🟠 8–14 · 🟢 ≤ 7. Reviewed at every milestone checkpoint; owner updates status.

| ID | Risk | Category | L | I | Score | Mitigation | Contingency (if it happens) | Owner | Status |
|----|------|----------|:-:|:-:|:-----:|------------|-----------------------------|-------|--------|
| R-01 | **Inaccurate data** (hours, locations, desk info), e.g. unverified brainstorm notes shown as fact | Data | 4 | 4 | 🔴 16 | Mandatory `source_url` + `verified_at`; DoD data checklist; show "Unknown" instead of guessing | Remove unverified records from demo build; show "may be outdated" banner | Content | Open |
| R-02 | **Scope creep.** The board has ~17 features; trying them all leaves none working | Delivery | 5 | 4 | 🔴 20 | MoSCoW frozen at M0; Should only after all Must done; Product Lead approves changes | Cut Should/Could; demo only Must journeys; show the rest as a roadmap slide | Product | Open |
| R-03 | **Floor plans unavailable or not publishable** (security/IP) | Data / Legal | 3 | 5 | 🔴 15 | Ask early (Q2); use only public or permitted plans; simplify to schematic room blocks | Hand-draw schematic floor for one building from walking survey; label as illustrative | Content | Open |
| R-04 | **3D map performance poor on phones** | Technical | 3 | 3 | 🟠 9 | ADR-0003 spike at M1; limit extrusion to pilot area; test on a mid-range device | Default to 2D with optional tilt toggle | FE/Map | Open |
| R-05 | **Spam / abuse** in anonymous reports or posts | Security | 3 | 3 | 🟠 9 | Rate limit per client hash; length caps; escape output; posting allowlist in MVP | Disable public writes; show seeded data only | BE/Data | Open |
| R-06 | **Live demo failure** (Wi-Fi, backend, deploy) | Delivery | 3 | 5 | 🔴 15 | Navigation/discovery needs no backend; F-10 queues reports locally if backend is down; PWA offline cache; code freeze at M3; rehearse on venue network | Switch to offline build or backup video immediately | Pitch | Open |
| R-07 | **Branding / trademark misuse** (GT, SGA logos) | Legal | 2 | 3 | 🟢 6 | Own visual identity; no official marks without permission | Strip marks before submission | Design | Open |
| R-08 | **OSM building footprints/heights wrong or missing** on campus | Data | 3 | 3 | 🟠 9 | Check pilot area at M1 | Hand-fix footprints for pilot buildings in `src/data/` | FE/Map | Open |
| R-09 | **Privacy concerns** with crowdsourced location/density | Privacy | 2 | 4 | 🟠 8 | No accounts, no server-side location; rotating client hash; state it in the UI and pitch | Turn off F-08 data collection; keep the feature as a mock | Tech | Open |
| R-10 | **Team availability.** Classes and exams overlap with the hackathon | People | 4 | 3 | 🟠 12 | Availability table in RACI; one owner per card; async updates | Reassign by priority; cut Should features | Product | Open |
| R-11 | **Misreading judging criteria.** We build the wrong emphasis | Delivery | 2 | 4 | 🟠 8 | Summarize rules at M0 (Q1); map each criterion to a demo moment | Re-weight the pitch, not the code | Product | Open |
| R-12 | **Third-party dependency outage** (OSM tile server, backend, Alexandria host) | Technical | 2 | 4 | 🟠 8 | Static `dist/` can be served from any host or a laptop; self-hostable PMTiles fallback; core navigation static | Serve local build from laptop | Tech | Open |
| R-13 | **External links rot** (menus, booking, transit pages) | Data | 3 | 2 | 🟢 6 | Link checker (CI when it exists) | Hide broken links; show "Unavailable" | BE/Data | Open |
| R-14 | **False expectations from simulated routing.** Users think a report reached Facilities/IT when it didn't | Product / Ethics | 3 | 4 | 🟠 12 | Clear "Prototype: not sent to Facilities/IT" label on F-10; official link for urgent issues; safety category shows emergency contact | Disable public reporting; demo with seeded reports only | Product | Open |
| R-15 | **No real room-availability data** for F-11 | Data | 4 | 3 | 🟠 12 | Ask early (Q7); design the data model so a real feed replaces the seed | Mocked schedule labeled "Demo data" | Tech | Open |
| R-16 | **Three prompts dilute the pitch.** We do P1, P2 and P3 halfway | Delivery | 3 | 4 | 🟠 12 | P1 stays the core; P2/P3 are one demo step each; Q6 decided at M0 | Drop F-11 to a roadmap slide; keep F-10 minimal (report + duplicate + status) | Product | Open |

## Risk heat map (current)

| Impact ↓ / Likelihood → | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| **5** | | | R-03, R-06 | | |
| **4** | | R-09, R-11, R-12 | R-14, R-16 | R-01 | R-02 |
| **3** | | R-07 | R-04, R-05, R-08 | R-10, R-15 | |
| **2** | | | R-13 | | |
| **1** | | | | | |

## Change log

| Date | Change | By |
|------|--------|----|
| 2026-11-14 | Initial register (R-01 to R-13) | _TBD_ |
| 2026-11-14 | Added R-14 to R-16 for P2/P3 integration | _TBD_ |
