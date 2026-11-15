<!-- summary: Rules for AI agents working on CIMS. Short on purpose; links out for details. -->
# CLAUDE.md

CIMS: Georgia Tech campus map (Vite + React 18 + TS + MapLibre). Two humans (David, Tato), each with their own agent.

## Navigate cheaply (token budget matters)

- Start at [`INDEX.md`](INDEX.md) → open only the target folder's `INDEX.md` → open only the files you need.
- **Before writing any function, check [`docs/FUNCTIONS.md`](docs/FUNCTIONS.md).** Reuse or extend; never duplicate.
- Read only the PRD story you're implementing. Never read `package-lock.json`, `dist/`, `node_modules/`.

## Hard rules

- **Never `git push` to `main`.** `main` auto-deploys to production. Work on a branch `feat/Txx-name`,
  push it, open a PR. **Merging:** only when your human explicitly asks you to ("review and merge",
  "mergea el PR"). Then review the diff, merge `main` into the branch and resolve conflicts keeping
  newer `main` code, run `npm run build`, require green CI, squash merge through the PR
  (`gh pr merge --squash --delete-branch`) and check the live site. Without that request, stop at a PR.
  If `main` already contains the PR's work, close the PR instead of resolving conflicts.
  Rules: [docs/MERGING-TO-MAIN.md](docs/MERGING-TO-MAIN.md).
- **Stay in your task's lane and files** ([WORKPLAN §2–3](docs/WORKPLAN.md)). Need another file? Stop and ask.
- **Hotspots** (`src/App.tsx`, `src/components/MapView.tsx`, `src/types/*`, `src/state/*`,
  `src/styles.css`, `src/config.ts`, `src/lib/supabase.ts`, `src/auth/`, `supabase/migrations/` (new files only), `package.json`, lockfile, `.github/`, `.claude/`, `deploy/`): only if the task says so.
- **No new dependencies** unless the task says so. **No secrets** in code (`.env` + `.env.example`).
- **Never invent data** (hours, locations, rooms). Records in `src/data/` need `source_url`, `verified_at`, `verified_by`.
- **Supabase (one shared project, all branch previews hit live data):** never run SQL/CLI/dashboard against it and never look for tokens. Schema change = a new, expand-only migration file in your PR (`npm run db:check`), flagged `Needs DB migration` for David to apply. Full rules: [docs/SUPABASE.md](docs/SUPABASE.md#changing-the-database-from-a-branch-read-this-before-touching-supabase). Accounts are the pre-made demo ones; **no sign-up flow**.
- `npm run build` must pass before you say you're done.

## Docs you must keep current (hooks will remind you)

- New/changed code file → line 1: `/** @file One line: what it's for. */`
- Every export → one-line JSDoc above it. Shared helpers (used by 2+ modules) live in `src/lib/`.
- New folder → write its one-line description in its `INDEX.md` (above the AUTO marker).
- New markdown → `<!-- summary: One line. -->` at the top.
- Never edit between `AUTO:START`/`AUTO:END`, since that part is generated ([docs/MAINTENANCE.md](docs/MAINTENANCE.md)).

## Finish every task with

1. `npm run build` ✅ 2. `/sync-docs` 3. Conventional Commit (`feat(scope): … (T-xx)`), push, draft PR
   with the template 4. Report to your human in ≤ 5 bullets: what changed, how you verified it, what's open.
