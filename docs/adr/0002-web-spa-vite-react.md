<!-- summary: Accepted: Vite + React + TS SPA, static build auto-deployed to Alexandria. -->
# ADR-0002: Web SPA with Vite + React + TypeScript, self-hosted with auto-deploy

- **Status:** Accepted (implemented in commit `57ebd42`, "Add map app backbone")
- **Date:** 2026-11-14
- **Deciders:** David Reina (implementation); team to ratify at M0
- **Related:** F-01 to F-11, NFR Performance, Risks R-06, R-12; code layout in [ARCHITECTURE.md](../ARCHITECTURE.md), deploy in [deploy/README.md](../../deploy/README.md)

## Context and problem statement

Users are students walking across campus and visitors who receive a link. Judges need to try it
instantly. The team has limited time and mixed skills. What platform and toolchain do we build on,
and how does it reach a public URL?

## Decision drivers

- Zero-install: open from a link or QR code
- Works on phones and laptops
- One codebase, one language, fast iteration
- Every merge to `main` visible on a public URL without manual steps

## Considered options

1. Single-page app: Vite + React 18 + TypeScript, static build served by nginx
2. Next.js (React, TypeScript) on Vercel
3. Cross-platform native (React Native / Flutter)

## Decision outcome

**Chosen option:** Vite + React + TypeScript SPA, because it's the simplest toolchain that does the
job, builds to static files, and was already working with a live URL. Hosting is a static `dist/` served by
nginx behind Traefik on a team member's server (Alexandria). A cron job rebuilds and deploys
`origin/main` within about a minute ([deploy/README.md](../../deploy/README.md)).

### Consequences

- 👍 Zero-install; a QR code on a pitch slide puts the app in judges' hands.
- 👍 Static output: no server to babysit for the navigation/discovery features.
- 👍 Auto-deploy from `main` keeps the live demo current.
- 👎 `main` is production. Broken builds are kept off the site (previous version stays live), but
  a *working-but-wrong* merge goes public. Hence: branches + PRs, `npm run build` before merging.
- 👍 Every branch gets its own preview at `https://<branch-slug>-cims.queenalexandria.online` (list: https://branches-cims.queenalexandria.online), added by David after this ADR.
- 👎 Depends on one person's server (Risk R-12). Fallback: any static host can serve `dist/`.
- 👎 Backend features (F-10, F-11) need a separate service: `server/` behind `/api` or a managed
  backend (see [ADR-0005](0005-backend-supabase.md)).
- ⚠️ PWA/offline caching is not set up yet. Add a service worker (e.g., `vite-plugin-pwa`) before M3
  for demo safety (Risk R-06).
- 👎 iOS Safari has no Web NFC, so F-15/F-18 check-in uses QR codes or URL-encoded NFC tags.

## Pros and cons of the other options

### Next.js on Vercel
- 👍 Per-PR preview deploys, built-in API routes
- 👎 More framework than a map SPA needs; the Vite app already existed and deployed

### Native (React Native / Flutter)
- 👍 Better device APIs (NFC, AR)
- 👎 App-store friction; judges can't install quickly; slower iteration

## Validation

M1: map page loads ≤ 3 s on a mid-range phone over 4G (Lighthouse mobile) from the live URL.
