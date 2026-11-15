<!-- summary: Rules for getting code into main (= production, auto-deploys). Read before every merge. -->
# Merging to `main`

> **`main` is production.** About 1 minute after a commit lands on `main`, Alexandria rebuilds and
> publishes it at https://cims.queenalexandria.online ([deploy/README.md](../deploy/README.md)).
> A failed build keeps the old version live, but a build that passes and still behaves wrong
> **goes public**. These rules exist for that case.

## The rules

1. **Nothing reaches `main` except through a PR.** No direct pushes, no force-pushes, ever.
2. **CI must be green**: indexes current, links valid, `npm run build` passes ([ci.yml](../.github/workflows/ci.yml)).
3. **One approval from a human who isn't the author** (or an explicit "review and merge" request to an agent). David's PRs are approved by Tato and vice versa.
   An agent's review counts as a pre-check, never as the approval.
4. **Agents merge only when their human asks.** Claude/Codex push branches and open PRs. When a
   teammate tells their agent "review and merge", the agent does the review, resolves conflicts,
   checks CI and squash merges through the PR on their behalf (decided by David, 2026-11-15). That
   request counts as the human's approval. Never `git push origin main`.
5. **Rebased on current `main`** right before merging (`git pull --rebase origin main`), and the
   branch preview (`https://<branch-slug>-cims.queenalexandria.online`) was checked after the rebase.
6. **Squash merge** with a Conventional Commit title: `feat(indoor): level selector (T-21)`.
   Delete the branch after merging.
7. **The person who merges checks the live site within 5 minutes.** Open the URL on a phone and
   try the feature. If it's broken, roll back right away (below).
8. **Hotspot PRs** (see [WORKPLAN §3](WORKPLAN.md#3-rules-that-keep-us-from-colliding)) merge first
   and fast. Rebase your lane branch after one lands.
9. **Don't merge in the hour before a demo, judging or a presentation**, and nothing but
   demo-blocking fixes after **code freeze (M3)**.
10. **Docs-only and data-only PRs follow the same rules.** Wrong data published is still a bug (Risk R-01).

## PR checklist (the reviewer verifies)

- [ ] Acceptance criteria of the linked story pass (ran it, didn't just read it)
- [ ] Checked at 360 px and on desktop
- [ ] Only the files of the task's lane changed (or the hotspot change was announced)
- [ ] New data has `source_url` + `verified_at`; no invented hours or locations
- [ ] No secrets, no new dependency without a `chore/` PR
- [ ] WORKPLAN box ticked if the task is complete

## Rollback

Something broke on the live site:

1. **Revert, don't fix forward under pressure:** `git revert <sha>` on a `fix/revert-<sha>` branch → PR.
2. **Fast-track:** a revert PR with green CI may be merged by its author alone. Tell the other
   person right away.
3. Confirm the live site is back (≈ 1 min). Then fix properly in a normal PR.
4. Deploy itself failing? The previous version stays live; David checks
   `/home/david/deploy/cims-deploy.log` on Alexandria.

## When the other person is unavailable

- **Docs-only or revert PRs:** you may self-merge after CI is green, and you must say so in chat.
- **Anything that changes app behavior:** wait, or get a review from a teammate who knows the code.
  An agent review alone is not enough.

## Releases

At each milestone (M1–M4) tag `main`: `git tag -a v0.M.0 -m "M<n>: <name>" && git push origin v0.M.0`.
The demo runs from a tagged commit, so you know exactly what's on stage.

## Enforcement: by discipline, not by GitHub (decided 2026-11-14)

GitHub does not enforce branch protection on a **private repo on a free personal account** (it shows
"rules won't be enforced until you move to a Team or Enterprise organization"). We decided **not** to make
the repo public or move it to an org just for this. So **nothing technical stops a direct push to `main`**:
the rules above hold because we, and our agents, follow them.

- Humans: never `git push origin main`. Always branch, PR, approval, squash merge.
- Agents: `CLAUDE.md` and `AGENTS.md` forbid pushing to `main` and allow merging a PR only when their human asks.
- Conflicts: merge `main` into the branch and keep `main`'s newer code. If `main` already contains the PR's
  work (squashed or redone), close the PR instead of resolving. Regenerate `INDEX.md` files, don't hand-merge them.
- CI still runs on every PR (`CI / check`), but a red check does **not** block the merge button. The person
  merging must look at it and not merge on red.
- If someone breaks a rule by accident, say so in chat and roll back with the procedure above.
- Revisit if the repo ever goes public or moves to an org: then enable protection on `main`
  (require PR, 1 approval, status check **CI / check**, linear history, no force-push or deletion).
