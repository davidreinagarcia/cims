<!-- summary: Proposed: curated data as GeoJSON in src/data/ with provenance fields. -->
# ADR-0004: Curated campus data as versioned GeoJSON in the repo

- **Status:** Proposed (location `src/data/` already in use; provenance fields pending)
- **Date:** 2026-11-14
- **Deciders:** _TBD_ (ratify at M0)
- **Related:** F-03 to F-07; Risks R-01, R-02

## Context and problem statement

Buildings, POIs, rooms, orgs and seed events are curated by hand from public GT sources. They change
rarely, must be reviewable, and their accuracy is a judging point. Where does this data live?

## Decision drivers

- Reviewable changes (who changed the hours of X, and on what source?)
- Works with zero backend (demo safety)
- Validated before it can break the app
- Non-developers on the team can contribute

## Considered options

1. GeoJSON/JSON files in `src/data/`, schema-validated before merge
2. Rows in the backend database edited through an admin UI
3. A shared spreadsheet exported at build time

## Decision outcome

**Chosen option:** versioned GeoJSON/JSON in `src/data/` (already the pattern: `src/data/places.json`),
with a schema per entity, validated before merge,
because every change goes through PR review with its `source_url`, and the core app needs no backend.

### Consequences

- 👍 Git history is the audit trail for data accuracy.
- 👍 Static files are CDN-cached and work offline.
- 👎 Non-developers must edit JSON. Mitigation: a short guide in CONTRIBUTING and an example record per type.
- ⚠️ Proposed additions to the current `PlaceProperties` (`src/types.ts`): provenance fields
  `source_url`, `verified_at`, `verified_by`. Records without them are marked "unverified" in the UI.
  The existing seed in `places.json` is flagged as approximate (`_note`), so it needs this.
- ⚠️ No CI exists yet; until it does, `npm run build` (type-check) plus reviewer spot-check is the gate.

## Pros and cons of the options

### Backend DB + admin UI
- 👍 Live edits
- 👎 Building an admin UI costs hackathon time; demo depends on backend

### Spreadsheet export
- 👍 Friendly for non-devs
- 👎 No review, no schema, silent breakage at build time

## Validation

A schema check (CI or a `npm run validate:data` script) rejects a deliberately broken record.
