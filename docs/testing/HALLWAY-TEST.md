<!-- summary: Hallway test plan (T-51): tasks, script, metrics and a results sheet for testing CIMS with at least 5 students outside the team. -->
# Hallway test plan (T-51)

**Goal:** check that someone who has never seen CIMS can finish the core tasks on their phone without help.
**Who:** at least **5 students who are not on the team** (mix: first-year or transfer, a club member, someone who knows campus well).
**Where / when:** any hallway or lounge, 5 to 7 minutes each, on **their own phone** if they agree, otherwise ours at 360 px.
**Pass criterion:** at least **80% of task attempts completed without help** ([MVP exit criteria](../02-mvp.md)).

## Rules for the observer
- Read the intro, then stay quiet. Do not point or explain. After 90 seconds stuck, note "needed help" and give one hint.
- Collect **no personal data**: no names, emails or photos. Use participant codes P1, P2...
- The app uses demo data in places (labeled DEMO) and seed data still marked "Approximate": say so if asked, do not defend it.
- Never pass off the demo sign-in as real: it is a mock.

## Intro (read aloud)
"This is a map of the Georgia Tech campus we are building. I will ask you to do a few things. We are testing the map, not you.
Please think aloud. Nothing you do is wrong."

## Tasks (the live app today; mark the ones not built yet as skipped)

| # | Task | Done when | Notes |
|---|------|-----------|-------|
| T1 | "Find the Stamps Student Center on the map and tell me what you can learn about it." | opens the place card and reads something from it | list or map |
| T2 | "You want a coffee near the library. Show only food places." | uses the Food layer toggle and finds a coffee place | needs verified data on the day |
| T3 | "Tilt the map and open the card of any building." | clicks a 3D building and sees its card | 2D/3D toggle is on the map |
| T4 | "Is there something happening tonight you could go to?" | opens Bulletin, picks an event, Show on map | events are DEMO |
| T5 | "The projector in this room is broken. Report it." | reaches the sign-in or the report stub | real flow only after T-23 |
| T6 | "Find a free room for 4 people with a whiteboard." | **skip until T-24** | |
| T7 | "Turn on airplane mode and reload." | app still loads and shows the offline notice | optional |

## What to record per task
Completed (yes / with help / no) · time in seconds · wrong clicks or detours · one quote · any confusion about DEMO labels or the sign-in.
After the tasks ask: "What was the most confusing thing?" and "Would you use this? For what?" (1 to 5 how easy it was).

## Results sheet

| Participant | Year / profile | T1 | T2 | T3 | T4 | T5 | T6 | Ease (1-5) | Biggest confusion |
|-------------|----------------|----|----|----|----|----|----|-----------|-------------------|
| P1 | | | | | | | | | |
| P2 | | | | | | | | | |
| P3 | | | | | | | | | |
| P4 | | | | | | | | | |
| P5 | | | | | | | | | |

**Success rate** = completed without help ÷ attempts (skipped tasks excluded). Write the number, the top 3 problems and the fixes in the weekly status
([template](../../templates/weekly-status.md)), and file each fix as a task.
