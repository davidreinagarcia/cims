# CLAUDE.md: instructions for AI agents working on CIMS

CIMS (Campus Interactive Map System) is a hackathon project: a Vite + React 18 + TypeScript SPA with
MapLibre GL JS, showing the Georgia Tech campus. Two humans (David, Tato) each run their own agent.

## Before you write any code

1. Read [`docs/WORKPLAN.md`](docs/WORKPLAN.md), especially §2 (file ownership) and §3 (rules).
2. Know your task ID (`T-xx`), its lane, and which files you may edit. If the human didn't say, ask.
3. Read the matching user story and acceptance criteria in [`docs/03-prd.md`](docs/03-prd.md).
4. Code layout: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). System design: [`docs/04-architecture.md`](docs/04-architecture.md).

## Hard rules

- **Never push to `main` or merge PRs.** `main` auto-deploys to the public site. Work on the task
  branch (`feat/Txx-short-name`), push it, open a **draft** PR. A human merges.
- **Stay in your lane's files.** Don't "also fix" things in files your task doesn't own. If a change
  is needed elsewhere, stop and tell the human.
- **Hotspot files** (`src/App.tsx`, `src/components/MapView.tsx`, `src/types/*`, `src/state/*`,
  `src/styles.css`, `src/config.ts`, `package.json`, lockfile, `.github/`, `deploy/`): don't edit
  unless the task says so explicitly.
- **No new npm dependencies** unless the task says so. Propose them instead.
- **`npm run build` must pass** before you say you're done.
- **No secrets** in code. Use `.env` (git-ignored) and document variables in `.env.example`.
- **Data needs provenance.** Records in `src/data/` get `source_url`, `verified_at`, `verified_by`.
  Never invent hours, locations, or room numbers. Leave the field out instead. Never cite the
  Miro board as a source.

## Conventions

- TypeScript strict; types from `src/types/` are the contract between lanes, so use them and don't redefine them.
- Map layers are modules in `src/map/layers/`; UI panels live in `src/panels/<name>/`.
- Conventional Commits: `feat(indoor): level selector` · reference `Refs: T-21, US-06.1`.
- Small PRs (< 400 changed lines, excluding data). Fill `.github/pull_request_template.md`.
- Check UI at 360 px wide and on desktop.

## When done

Push the branch, open a draft PR, and report to the human: what changed, how you verified it
(build output, screens checked), and anything left open. If the task completes a WORKPLAN item,
tick its box in the same PR.
