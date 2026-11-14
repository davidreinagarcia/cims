<!-- summary: Done criteria for stories, data changes, features and releases. -->
# Definition of Done

"Done" means **demoable, reviewed, and trustworthy**. There are three levels; each includes the one
before it.

## 1. User story is done when…

- [ ] All acceptance criteria in the [PRD](03-prd.md) pass, verified by someone other than the author
- [ ] Code merged to `main` via PR with ≥ 1 approval; `npm run build` passes (type-check + build), plus CI checks once they exist
- [ ] Works on **mobile (360 px)** and **desktop**, in Chrome and Safari
- [ ] Keyboard-accessible; interactive elements have accessible names; color is not the only signal
- [ ] Empty, loading and error states handled (no blank screens, no raw errors)
- [ ] No secrets, API keys, or personal data committed
- [ ] Unit tests for non-trivial logic (search ranking, open-now calculation, rate limiting)
- [ ] Reviewer checked the branch preview URL on a phone; after merge, checked on the live URL (`main` auto-deploys)
- [ ] Board card moved to Done with the PR linked

## 2. Data change is done when…

- [ ] Record passes schema validation (and `npm run build`)
- [ ] `source_url` points to an **official or primary** source (not a blog, not AI output)
- [ ] `verified_at` set to the verification date; `verified_by` set
- [ ] Hours / location spot-checked on the source page by the reviewer
- [ ] Displays correctly on the map (pin position, category icon, card fields)

## 3. Feature (F-xx) is done when…

- [ ] All its **Must** stories are done
- [ ] Included in the demo script, or explicitly marked "not in demo"
- [ ] Hallway-tested with ≥ 2 people outside the team; issues triaged
- [ ] Lighthouse mobile: Performance ≥ 80, Accessibility ≥ 90 on pages it touches
- [ ] Docs updated (README if setup changed, ADR if a decision was made, PRD changelog if scope changed)

## 4. Release (demo / submission) is done when…

- [ ] All **Must** features done (MVP exit criteria in [MVP](02-mvp.md))
- [ ] Demo script runs 3× in a row on the demo device without errors
- [ ] Offline fallback tested with network off
- [ ] Backup demo video recorded and stored where all presenters can reach it
- [ ] Production URL + QR code tested on an iPhone and an Android phone
- [ ] OSM attribution visible; no unauthorized logos
- [ ] README accurate: description, setup, team, license
- [ ] Release tagged in git (`vX.Y.Z`) with release notes
- [ ] Submission completed with ≥ 1 h buffer before deadline

## What "done" is not

- "Works on my machine"
- "Merged but not tested on a phone"
- "Data looks right" without a source
- "Done except for the edge cases"
