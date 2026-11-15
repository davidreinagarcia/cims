<!-- summary: Branching, commits, PRs, code review, data contributions, local dev. -->
# Contributing

Thanks for helping build **CIMS**. This guide keeps a fast-moving hackathon team from
stepping on each other.

## TL;DR

> ⚠️ **`main` is production.** Every commit on `main` auto-deploys to
> https://cims.queenalexandria.online within about a minute ([deploy/README.md](deploy/README.md)).
> Never push straight to `main`; never merge without `npm run build` passing.

1. Pick a card on the board → assign yourself → move it to **In Progress**.
2. `git switch -c feat/F-03-building-card`
3. Small commits using Conventional Commits. `git pull --rebase` before pushing.
4. Open a PR early (draft is fine), fill the template, link the card.
5. Green CI + approval from the other person → **squash merge** ([MERGING-TO-MAIN](docs/MERGING-TO-MAIN.md)). Delete the branch.

## Workflow

### Board

GitHub Projects with columns **Backlog → Ready → In Progress → In Review → Done**.
A card is **Ready** only if it has: a feature ID (`F-xx`), acceptance criteria (from the
[PRD](docs/03-prd.md)), and an owner. WIP limit: **2 cards per person**.

### Branches

`main` must always work because it **deploys itself**. Treat it as protected: no direct pushes.

| Prefix | Use | Example |
|--------|-----|---------|
| `feat/` | New feature or story | `feat/F-06-level-selector` |
| `fix/` | Bug fix | `fix/search-nickname-ranking` |
| `data/` | Curated data changes | `data/food-pois-central-campus` |
| `docs/` | Docs, ADRs | `docs/adr-0006-search-library` |
| `chore/` | Tooling, deps, CI, deploy | `chore/ci-build-check` |

### Commits — [Conventional Commits](https://www.conventionalcommits.org/)

```
<type>(<scope>): <imperative summary, ≤ 72 chars>

[optional body: why, not what]

Refs: F-03, US-03.1
```

Types: `feat`, `fix`, `data`, `docs`, `refactor`, `test`, `chore`, `perf`, `style`.
Example: `feat(map): highlight building on first tap`.

### Pull requests

- Keep PRs small (aim for < 400 lines changed, excluding data files).
- Fill the [PR template](.github/pull_request_template.md): what, why, screenshots (mobile + desktop), how to test.
- Link the story (`US-xx.y`) and close the card.
- Self-review your diff before requesting review.

### Code review

- Review within **2 hours** during hackathon hours. Unblocking others comes before your own card.
- Reviewer checks the [Definition of Done](docs/07-definition-of-done.md), opens the branch's
  **preview URL** on a phone (`https://<branch-slug>-cims.queenalexandria.online`, all listed at
  https://branches-cims.queenalexandria.online), and verifies acceptance criteria.
- Put the preview link in the PR description.
- Prefix comments: **`blocker:`** must fix · **`suggestion:`** optional · **`nit:`** cosmetic · **`question:`**.
- Approve when it's good enough to ship, not when it's perfect.

## Changing the database

One shared Supabase project serves `main` and every branch preview. Do not touch it directly: add an expand-only migration file under `supabase/migrations/`, run `npm run db:check`, and write `Needs DB migration: <file>` in your PR so David can apply it. Details and rules: [docs/SUPABASE.md](docs/SUPABASE.md#changing-the-database-from-a-branch-read-this-before-touching-supabase).

## Contributing data

Curated data lives in `src/data/` (see [ADR-0004](docs/adr/0004-curated-data-as-versioned-geojson.md)
and [ARCHITECTURE.md](docs/ARCHITECTURE.md)). The quickest contribution is a new Feature in
`src/data/places.json`; it shows up on the map and in the sidebar automatically.

Current shape, plus the **proposed provenance fields** (ADR-0004) to add as you verify records:

```json
{
  "type": "Feature",
  "properties": {
    "id": "clough",
    "name": "Clough Undergraduate Learning Commons",
    "category": "academic",
    "description": "Classrooms, study space and collaboration areas.",
    "source_url": "https://<official-gt-page>",
    "verified_at": "YYYY-MM-DD",
    "verified_by": "<github-handle>"
  },
  "geometry": { "type": "Point", "coordinates": [-84.3964, 33.7750] }
}
```

> `source_url`, `verified_at` and `verified_by` above are placeholders, so don't commit them as-is.
> New categories go in `Category` in `src/types.ts`.

Rules:
- **Primary sources only.** Official GT pages, signage you photographed, or staff. The Miro board is
  a lead to follow up on, not a source.
- If you can't verify a field, omit it. The UI shows "Unknown".
- One data PR per category/area keeps reviews fast.

## Architecture decisions

Any decision that's hard to reverse or that a judge might question (library, data storage, hosting,
privacy approach) gets an ADR. Copy [`docs/adr/0000-template.md`](docs/adr/0000-template.md),
open a `docs/` PR, Tech Lead approves.

## Local development

Requires Node 20+ (22 recommended).

```bash
npm install
npm run dev        # http://localhost:5173 (also on your LAN, --host)
npm run build      # type-check (tsc --noEmit) + production build. MUST pass before merging
npm run preview    # serve the production build locally
```

Planned (not set up yet): `npm run lint` (ESLint), `npm test`, `npm run validate:data`.

## Code style

- TypeScript `strict`. No `any` without a comment explaining why.
- Prettier + ESLint (to be added); until then, match the surrounding code.
- Components: small, typed props, colocated tests.
- No secrets in code; use `.env.local` (git-ignored) and keep `.env.example` updated.

## Code of conduct

Be kind, assume good intent, critique the work and not the person. Pressure is high in a hackathon;
that's when this matters most.
