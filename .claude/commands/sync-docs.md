---
description: Semantic docs maintenance pass. Run at the end of every task (the indexes themselves are automatic).
---
Do a docs maintenance pass for the current branch. Be brief and token-frugal: use `git diff --stat origin/main...HEAD` and the INDEX.md files; don't read whole folders.

1. Run `npm run index` and fix every warning that concerns files changed on this branch (summaries, JSDoc, folder descriptions, broken links, duplicates).
2. If this branch completes a task in `docs/WORKPLAN.md`, tick its box (one-line edit).
3. If a technical decision was made (library, data format, storage, API shape), add or supersede an ADR in `docs/adr/` and update its index row.
4. If scope or acceptance criteria changed, update `docs/03-prd.md` and add a changelog row.
5. If code moved or folders were created, make sure each new folder's INDEX.md has its one-line description.
6. If a function now exists in two places, move it to `src/lib/` and import it from both.
7. Report what you changed in ≤ 5 bullets. Don't touch files outside this branch's scope beyond the docs above.
