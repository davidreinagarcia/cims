# ADR-0005: Supabase for user-generated data

- **Status:** Proposed
- **Date:** 2026-11-14
- **Deciders:** _TBD_ (ratify at M0)
- **Related:** F-07 (posting), F-08, F-10, F-11; Risks R-05, R-09, R-14

## Context and problem statement

Study-space density reports (F-08), issue reports (F-10) and org event posts need persistence,
geo queries ("reports within 25 m") and basic abuse protection. We have no time to run servers.

## Decision drivers

- Managed, free tier, minutes to set up
- Postgres + PostGIS for proximity queries
- Row-level security so the client can write directly without a custom API
- Object storage for report photos

## Considered options

1. Supabase (Postgres + PostGIS + RLS + storage)
2. Firebase (Firestore + storage)
3. Custom Node API in `server/` behind `/api`, deployed next to the frontend on Alexandria (the path
   suggested in [ARCHITECTURE.md](../ARCHITECTURE.md)), with Postgres + PostGIS in Docker

## Decision outcome

**Chosen option:** Supabase, because PostGIS covers the deduplication radius query natively, RLS
lets us enforce insert-only anonymous writes with rate limits in SQL, and it's free at our scale.

### Consequences

- 👍 SQL view computes "last 2 h density" in one place.
- 👍 Navigation/discovery (F-01 to F-07) **does not depend on it**; backend outage ≠ demo outage.
- 👎 F-10 (Must since v0.2) does depend on it; mitigated with a client-side queue that syncs when the backend is back.
- 👎 Vendor dependency; mitigated because it's standard Postgres (portable).
- ⚠️ Anonymous writes invite spam: rate limit per client hash + length caps + allowlist for posting (Risk R-05).

## Pros and cons of the options

### Firebase
- 👍 Great realtime SDK
- 👎 No native geo radius queries; NoSQL modeling for relational data

### Custom `server/` on Alexandria
- 👍 Full control; same host and deploy pipeline as the frontend; no third-party account
- 👍 Fits the existing "proxy `/api` in vite.config.ts and nginx" plan
- 👎 We write auth/rate limiting/storage ourselves; one more container on one person's server

> **Open:** this is a genuine toss-up between options 1 and 3. Decide at M0 with whoever builds F-10.

## Validation

M2: duplicate-issue lookup within 25 m returns correct results; 2nd density report from the same
client within 15 min is rejected.
