<!-- summary: How indexes, the function registry and docs stay current automatically, and what agents do. -->
# Maintenance system: docs that keep themselves current

**Goal:** an agent finds anything in the repo by reading ~2 small files, never rewrites a function that
already exists, and nobody has to remember to update indexes. Machines do the mechanical part;
agents do the judgment part; humans do nothing extra.

## What exists

| Artifact | What it is | Who writes it |
|----------|------------|---------------|
| [`INDEX.md`](../INDEX.md) (root) | Global map: every folder with a one-line description + root files | Generated (hand-written header kept) |
| `<folder>/INDEX.md` | Every file in that folder: one-line summary + exported names; subfolders | Generated (one-line folder description is hand-written) |
| [`docs/FUNCTIONS.md`](FUNCTIONS.md) | Registry of every exported function, component, type and constant: signature, location, purpose; flags possible duplicates | Generated (rules header hand-written) |
| [`scripts/gen-index.mjs`](../scripts/gen-index.mjs) | The generator. Zero dependencies, deterministic, no tokens spent | — |

Summaries come **from the source itself**, so they can't drift:
- Code files: first line `/** @file One line. */` (or a leading `//` comment block)
- Exports: the first line of the JSDoc right above them
- Markdown: `<!-- summary: One line. -->`, else the first sentence
- Folders: the line under the title in that folder's `INDEX.md` (above the AUTO marker)

## How it stays current (no manual input)

| Layer | When | What it does |
|-------|------|--------------|
| **Claude SessionStart hook** | Every agent session starts | Enables git hooks + the merge driver in that clone, regenerates indexes |
| **Claude Stop hook** | Every time an agent finishes a turn | Regenerates indexes; if files **it changed** lack a summary/JSDoc, break a link, or duplicate an existing function, it **blocks the agent from finishing** until fixed (once per turn, no loops) |
| **git pre-commit hook** (`.githooks/`) | Every commit (human or agent) | Regenerates and stages indexes |
| **Merge driver** (`.gitattributes`) | Rebase/merge | Generated files never show conflict markers; they're regenerated on the next run |
| **CI** (`.github/workflows/ci.yml`) | Every PR and push to `main` | Fails if indexes are stale or a relative link is broken (safety net for anyone without hooks) |
| **`/sync-docs`** (`.claude/commands/`) | Agent runs it at the end of every task (CLAUDE.md rule) | The judgment part: tick WORKPLAN boxes, write/supersede ADRs, PRD changelog, move duplicated helpers to `src/lib/` |

Hook wiring: [`.claude/settings.json`](../.claude/settings.json) (shared, committed) →
[`scripts/claude-hook.mjs`](../scripts/claude-hook.mjs).

## Token-efficiency rules (for agents)

1. Enter through `INDEX.md` → the folder's `INDEX.md` → only the files you need. Never `ls -R`,
   never read a whole folder, never read `package-lock.json`, `dist/`, `node_modules/` (denied in settings).
2. Check `docs/FUNCTIONS.md` before writing any function. Reuse beats rewrite.
3. Read docs by section: the PRD story you're implementing, not the whole PRD.
4. `docs/brainstorm/` is raw input. Open it only when you need original wording.
5. One task per session; start fresh for the next task.

## If something goes wrong

| Symptom | Fix |
|---------|-----|
| CI says "Stale generated files" | `npm run index`, commit |
| CI says "Broken relative links" | Fix the link it names (usually a moved/renamed file) |
| Conflict markers in an `INDEX.md` | `npm run index`; the file is fully regenerated |
| Hooks not running in your clone | `npm run setup:hooks` (agents do this automatically) |
| Using an agent without Claude hooks (e.g., Codex) | It follows [AGENTS.md](../AGENTS.md): run `npm run index` before committing |
