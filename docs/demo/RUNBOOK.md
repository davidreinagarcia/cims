<!-- summary: Demo runbook: the 3-minute script mapped to what works today, what still blocks each step, the pre-flight checklist and plan B. -->
# Demo runbook (T-50, T-54)

Live site: https://cims.queenalexandria.online · Branch previews: https://branches-cims.queenalexandria.online
The script is the one in [MVP](../02-mvp.md#demo-script-3-minutes-draft). This page says, step by step, **what works today**,
what still blocks it and who owns it. Update the status column as tasks land.

## Readiness per step (as of 2026-11-14)

| # | Step | What to do on screen | Status | Blocker / owner |
|---|------|----------------------|--------|-----------------|
| 1 | Hook | "First week, your class is in Kendeda. Where is it?" | ✅ | none |
| 2 | Find a building | Tilt the map, **click Kendeda** (or pick it from a place card): the building lifts in gold hatching and its card opens | 🟡 | Search does not include buildings yet (T-14 remainder, A). Clicking the 3D building works. Hours and BuzzCard show Unknown until T-30-style data exists for buildings |
| 3 | Find a room | Enter the building, choose a floor, room highlighted | 🔴 | Indoor viewer T-21 and Kendeda floors T-20 (B). **Never invent room numbers** |
| 4 | Discover | Toggle **Food**, then **Makerspaces**, then **Exercise**: pins by category, clusters in the Student Center | 🟡 | Works with `?drafts=1`. For the real demo, **verify the priority records first** (list below) so the pins are public |
| 5 | Community | Bulletin tab: tonight's demo event, **Show on map** | ✅ | Events are labeled DEMO on purpose; real organizations are drafts until verified |
| 6 | Report it | Open a place card, **Report an issue**: the demo sign-in appears, pick a persona, the action resumes | 🟡 | Sign-in is a mock (T-25, done). The real report flow is T-23 (B); today it ends in "Report form arrives with T-23" |
| 7 | Find a room (P3) | "Available now, 4+ people, whiteboard" | 🔴 | T-24 (B) after T-20/T-21 |
| 8 | Vision | Roadmap slide: no-show release, real SSO, tickets, density, VR | ✅ | slide in T-52 |

✅ works · 🟡 works with a caveat · 🔴 not built yet. **If a step is red at rehearsal time, cut it and say it is on the roadmap**; do not fake it.

## Verify before the demo (priority 1, shown in step 4)

Open each `source_url` in `docs/data/UNVERIFIED.md`, check it, then `npm run data:verify -- <id> --by <name>`.
- Coffee and dining: `kaldis-clough`, `dunkin-pavilions`, `sideways-cafe-library`, `dancing-goats-student-center`, `brittain-dining-hall`, `north-avenue-dining-hall`
- Makerspaces: `flowers-invention-studio`, `hive-makerspace`, `innovation-ideation-studio`, `yang-aero-maker-space`, `mill-makerspace`, `bme-design-shop`
- The 7 seed places still read "Approximate"; check at least `student-center` (OSM and Dining call it **John Lewis** Student Center).

## Pre-flight checklist (T-54: rehearse 3 times, clean)

- [ ] Latest `main` deployed: `tail /home/david/deploy/cims-deploy.log`; open the live URL on the demo device
- [ ] Hard reload once online, then **pan and zoom over the demo area** so the map tiles are cached (the service worker keeps them for offline)
- [ ] Turn Wi-Fi off and reload: the app, search and viewed tiles still work (the offline notice appears)
- [ ] Sign-in demo: sign out first so the audience sees the dialog; pick **Demo Student**
- [ ] Phone check at 360 px and a desktop check; screen brightness and browser zoom at 100%
- [ ] Code freeze: nothing merges in the hour before the demo or judging ([MERGING-TO-MAIN](../MERGING-TO-MAIN.md))
- [ ] Backup video recorded (T-53) and on the demo device, plus the deck open (T-52)

## Plan B

| If | Do |
|----|----|
| Venue network is slow or down | Keep going: the app and every area you visited already work offline; say so, it is a feature |
| The site is down | Show the backup video (T-53); the previews on `branches-cims` are a second URL |
| A step is red | Skip it and move to the roadmap slide |
| Sign-in dialog confuses people | Say once: "this is a demo sign-in, no real authentication; real Georgia Tech SSO is the next phase" (Risk R-17) |
