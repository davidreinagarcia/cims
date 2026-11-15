<!-- summary: Audit report of the Gemini deep research pass on campus POIs (2026-11-14): what is solid, what is missing, what to verify. -->
# Gemini POI research, second pass (2026-11-14)

Deep research run by David with Gemini to collect locations and opening hours for every map layer. **Nothing here is verified.** Hours were applied to existing `draft` records only (see "Applied"); a person seals each one with `npm run data:verify`. New venues are listed under "Pending" because they have no coordinates yet.

## Status

- Source claim: 150 records, 145 Features plus 5 confirmed `DOES NOT EXIST` removals, for 9 files (`corrections.json` plus the 8 layers).
- **No coordinates.** Gemini had no map lookup, so every Feature has `geometry: null` (`coord_precision: "building"` where a building is known). They cannot be imported until each one gets a real `[lon, lat]` from OpenStreetMap, as in the existing `food.json` records.
- **No OSM ids** in any record.
- Hours are in-person Fall semester hours only. Anything not found on an official page is `null`.
- 69 of 150 records are `confidence: low` (list below). Do not publish those without checking.

## Corrections to the first pass

| Topic | Result |
| --- | --- |
| Panda Express (Student Center, 1st floor) and Twisted Taco (2nd floor) | Exist. Our earlier suspicion was wrong. |
| Jimmy John's | At The Pavilions (410 4th St NW), **not** the Student Center. Matches `jimmy-johns-pavilions` already in `food.json`. |
| Brittain Dining Hall | Mon to Fri 11:00 to 23:00, closed weekends. Codex later confirmed the reopening on 17 Aug 2026 after a two year renovation (this report first doubted it). |
| Women's Resource Center and LGBTQIA Resource Center | Merged into **Belonging & Student Support**. Do not map them as two offices. |
| Counseling | Center for Mental Health Care & Resources, 404-894-2575, Smithgall Suite 238. |
| Wellness Empowerment Center | Mon to Fri 08:00 to 17:00. No dedicated Health Initiatives page found. |
| Transit | PTS retired the Tech Trolley (replaced by the Gold Route, electric heritage return planned for 2027), the Midnight Rambler, and the Fall 2026 NARA Science Square route. |

## Counts per layer

| File | Total | Active | Removed | High | Medium | Low |
| --- | --- | --- | --- | --- | --- | --- |
| corrections.json | 31 | 29 | 2 | 16 | 7 | 6 |
| makerspace.json | 10 | 10 | 0 | 1 | 1 | 8 |
| food.json | 15 | 15 | 0 | 1 | 0 | 14 |
| printing.json | 12 | 12 | 0 | 7 | 2 | 3 |
| exercise.json | 14 | 14 | 0 | 6 | 3 | 5 |
| health.json | 6 | 6 | 0 | 2 | 2 | 2 |
| orgs.json | 13 | 13 | 0 | 0 | 3 | 10 |
| transport.json | 37 | 34 | 3 | 3 | 14 | 17 |
| support.json | 12 | 12 | 0 | 2 | 6 | 4 |
| **Total** | **150** | **145** | **5** | **38** | **38** | **69** |

## Low confidence records and why

All have `hours: null`. IDs are Gemini's, and may change on import.

### corrections.json

- `gt-library-infodesk-ask-us`: infodesk page truncated before staffed desk hours.
- `oit-technology-support-center`: housing tech-support page links an unexpanded "See Hours". No oit.gatech.edu walk-in page retrieved.
- `career-center`: contact page has no hours. Only partial Campus Closet hours found.
- `starbucks-bn-tech-square`: only January 2026 modified hours found, not standard Fall.
- `waffle-house-tech-square`: no hours on wafflehouse.com.
- `georgia-tech-police-department`: no police.gatech.edu page retrieved, so address, room and lobby hours are unverified.

### makerspace.json

- `gt-prototyping-lab`: FAQ page has no building, room or hours.
- `idea-lab-mrdc`: staffed hours table truncated.
- `student-competition-center`: 14th Street location and teams listed, no hours.
- `intelligent-systems-makerspace-mrdc`: room MRDC 3330, no hours.
- `coc-room-30-maker-area`: only mentioned in the ME safety page.
- `library-makerspace`: no dedicated page retrieved.
- `college-of-design-digital-fabrication-lab`: mentioned without hours or room.
- `aero-maker-space`: no building or hours found.

### food.json

- `taim-mediterranean-kitchen-student-center`, `tech-it-to-go-student-center`: listed open, no hours page.
- Tech Square group (listed open on dining.gatech.edu, no hours or address): `kaldis-coffee-tech-square`, `moes-midtown-tech-square`, `rays-pizza-tech-square`, `sankranti-tech-square`, `tech-square-tavern`, `tin-drum-asian-kitchen-tech-square`.
- `gold-and-bold-coffee-roasters-ibb`, `sideways-cafe-blue-donkey`, `buenos-dias-cafe`: named on the hours page, hours block not captured.
- `wreck-stop-west-village`: only referenced as a landmark.
- `campus-food-trucks`: rotating locations and schedules not retrieved.
- `campus-vending-clusters`: only Clough vending mentioned.

### printing.json

- `arch-west-plot-shop-and-printers`, `hinman-research-building-printers`, `mrdc-3336-computer-and-printer-lab`: locations listed, no hours.

### exercise.json

- `crc-bike-shop`: page truncated after Mon, Wed and Fri hours.
- `peters-parking-deck-courts`, `couch-park`, `burge-recreation-courts`, `roe-stamps-fields`: not in the retrieved crc.gatech.edu/locations pages.

### health.json

- `care-center-for-assessment-referral-education`: no care.gatech.edu page, unclear if separate from the Center for Mental Health Care & Resources.
- `health-initiatives`: no page retrieved. Health promotion and VOICE appear under the Wellness Empowerment Center.

### orgs.json

- `john-lewis-student-center`, `exhibition-hall`, `student-center-orgs-floor`: no studentcenter.gatech.edu pages retrieved.
- `student-government-association-sga`: no sga.gatech.edu page.
- `greek-village`: no Fraternity & Sorority Life pages.
- `ferst-center-for-the-arts`, `mccamish-pavilion`, `bobby-dodd-stadium`: venue pages not retrieved.
- `tech-green`, `kessler-campanile`: no official hours or venue page.

### transport.json

- EV charging, six decks with spaces listed and no deck hours: `ev-charging-area-6-tech-square`, `ev-charging-w02-student-center-deck`, `ev-charging-w22-dalney-deck`, `ev-charging-w23-north-deck`, `ev-charging-wr30-curran-deck`, `ev-charging-e81-tech-square-deck`. `ev-charging-e40-klaus-deck` states permit rules (E40 Mon to Fri 08:00 to 17:00, any GT permit after 17:00 and weekends) but no overnight deck hours.
- Visitor parking, hours or rates table truncated or missing: areas 12 (Dalney, W22), 5 (North Deck, W23), 6 (George Tower), 1 (North Ave), 3 (Student Center, W02), E81 Tech Square deck, Greek lot ER55.
- `marta-midtown-station`, `marta-north-avenue-station`: no itsmarta.com station page retrieved.
- `campus-bike-share-stations`: only Spin event bikes and bike registration found, no active dock network.

### support.json

- `veterans-resource-center`: address verified on registrar.gatech.edu, no walk-in hours.
- `multicultural-centers-omed`: no official OMED page retrieved.
- `student-center-welcome-desk`: no location or hours.
- `barnes-and-noble-tech-square`: address and phone verified via buzzcard.gatech.edu, standard Fall hours not found.

## Applied in this PR (22 existing records got `hours`)

Coordinates, ids and `source_url` were not touched. All stay `draft`. Gemini's source for each is in its original answer; check hours against the venue's own page before verifying.

| Layer | Record id | Note |
| --- | --- | --- |
| food | `panda-express-student-center`, `twisted-taco-student-center` | Gemini confirms both exist. |
| food | `brittain-dining-hall` | Mon to Fri 11:00 to 23:00. Meal periods and the "reopened after renovation" claim are unconfirmed. |
| food | `north-avenue-dining-hall`, `west-village-dining-hall` | From dining.gatech.edu. |
| food | `jimmy-johns-pavilions` | Pavilions only, no Student Center location. |
| orgs | `office-registrar` | 09:00 to 16:00 (the Codex check corrected Gemini's 08:00 to 16:30). |
| orgs | `office-international-education`, `scholarships-financial-aid`, `center-student-engagement` | Weekday office hours, from Gemini only. |
| health | `stamps-health-services` | Thursday opens 09:00. |
| health | `mental-health-care-resources` | Mon to Fri 08:00 to 17:00. |
| health | `wellness-empowerment-center` | Thursday left out: two official pages disagree (08:00 or 09:00). |
| makerspace | `flowers-invention-studio` | After-hours slot (17:00 to 18:00) is training only. |
| makerspace | `hive-makerspace` | Mon to Fri 10:00 to 18:00. |
| printing | `print-studio-price-gilbert` | Saturday 12:00 to 18:00 and Sunday 10:00 to 22:00. Looks odd, but Codex confirmed it on the official page. |
| printing | `crosland-printing` | 24/7 for GT affiliates, BuzzCard 18:00 to 07:00. |
| printing | `printing-copying-services-marietta` | Hours came from the architecture student guide, not an OIT page. |
| exercise | `crc` (in `places.json`) | Sunday 09:00 confirmed for Fall 2026. A central page says 10:00. |
| exercise | `crc-climbing-wall` | Staffed hours only, weekdays. Weekends left unknown. |
| exercise | `crc-competition-pool`, `crc-crawford-pool` | Recreational swim hours. The Nov 14 swim meet hours were left out. |

Left out on purpose: pharmacy hours (Gemini calculated them, the page does not list them), Clough printing ("typically 24/7"), and every first pass hour not re-confirmed in pass 2.

## Follow up review by Codex

We asked Codex to re-check the doubtful points. Results, with what they confirmed and refuted, are in [`codex-review/`](codex-review/README.md). It also found OSM points for 28 of the venues below, and the bus data is in [`transit/`](transit/README.md). Two of this report's earlier worries were wrong: Brittain really did reopen after a renovation, and the Print Studio Saturday is real. The 3:15 a.m. bus service is over.

## Pending: new venues, need coordinates before they can be added

Hours below are as Gemini reported them from the cited official page. All Mon to Fri unless stated. None has coordinates.

| Venue | Where | Hours | Source |
| --- | --- | --- | --- |
| Naugle Writing and Communication Center | Clough 447 | 09:00 to 17:00 in person (17:00 to 20:00 online only) | communicationcenter.gatech.edu |
| BuzzCard Center | The Pavilions (410 4th St NW) | 08:00 to 17:00 | buzzcard.gatech.edu/contact |
| Bursar's Office | Lyman Hall 111 | 08:30 to 16:00 | bursar.gatech.edu |
| Office of Disability Services | Smithgall (Flag) Suite 123 | 08:00 to 17:00 | disabilityservices.gatech.edu |
| Belonging and Student Support | Smithgall Suite 140 | 08:00 to 17:00 | students.gatech.edu/content/hours-operation |
| PTS Customer Service Center | E81 Tech Square deck, 770 Spring St | 08:00 to 16:00 | pts.gatech.edu/contact |
| Wreck Techs desk, East Campus | Howell Hall lounge | Sun to Thu 14:00 to 22:00, Fri 14:00 to 18:00 | wrecktechs.gatech.edu |
| Wreck Techs desk, West Campus | West Village, next to Wreck Stop | same as above | wrecktechs.gatech.edu |
| Montgomery Machining Mall | MRDC 2nd floor | 06:30 to 16:30 | me.gatech.edu |
| Ken Byers Tennis Complex | outdoor courts | 17:00 to 22:00, Sat 10:00 to 14:00 | crc.gatech.edu/locations |
| CRC Bike Shop, ORGT Wilderness Outpost | CRC | Outpost 14:00 to 19:00 (Fri 17:00). Bike shop hours cut off | crc.gatech.edu |
| Boho Taco | 22 5th St NW (Tech Square) | daily 11:00 to 22:00 | dining.gatech.edu |
| Conference Dining Room | 800 Spring St NW | daily 07:00 to 23:00. Check it is open to the public | dining.gatech.edu |
| Visitor parking areas 4, 10, 11, 12 | various | 24/7, $2/h, 4 h max. Sunday row cut off for areas 10, 11, 12 | pts.gatech.edu/parking/visitor-parking |
| EV charging, Visitor Area 4 | Ferst Dr / State St | 24/7, 6 ChargePoint spaces | pts.gatech.edu |
| Stinger routes (Gold, Clough, Green, Blue, Red, Northside, Weekend Midtown, Emory) and Stingerette | routes, not points | See Gemini's answer. Needs stop list and trace, a point layer cannot show them | pts.gatech.edu |

Not mappable yet (no building or room published): STAR, Office of Student Integrity, Parent and Family Programs, New Student and Transition Programs, Housing Help Desk, Child Care Services.

Transit: the 3:15 a.m. service from the 2025 notice is over. Fall 2026 is Gold to midnight, Red and Blue to 22:00 (see `transit/README.md`).

## Next steps

1. Look up OSM coordinates for the "Pending" venues. Never reuse one point for two venues. Add them as `draft` with `source_url`.
2. Open items nobody has settled are listed in `codex-review/README.md` (Career Center, SGA, OMED, Starbucks, VRC building, Belonging suite).
3. Run `npm run data:verify -- <id> --by <name>` per record once hours, address and point are checked.
4. Draw the bus routes. Line and stop data now exist in `transit/` (not wired into the app).

## Sources used by Gemini

- https://dining.gatech.edu/dining-locations/hours-operation
- https://dining.gatech.edu/location/west-village-dining-hall
- https://dining.gatech.edu/location/panda-express
- https://wrecktechs.gatech.edu/
- https://communicationcenter.gatech.edu/
- https://crc.gatech.edu/hours/
- https://inventionstudio.gatech.edu/
- https://libcal.library.gatech.edu/spaces?lid=17797&gid=39167
- https://library.gatech.edu/infodesk
- https://students.gatech.edu/content/hours-operation
- https://pride.gatech.edu/on-campus-resources/
- https://studentlife.gatech.edu/news/campus-community-invited-come-together-during-georgia-tech-suicide-prevention-week
- https://www.pts.gatech.edu/contact/
- https://www.pts.gatech.edu/2026/08/17/transportation-update-for-fall-2026/
- https://www.pts.gatech.edu/2025/08/06/new-stinger-and-stingerette-routes-2025/
- https://www.pts.gatech.edu/2026/10/19/an-icon-returns-in-2027-now-fully-electric/
- https://www.pts.gatech.edu/2021/03/24/farewell-tech-trolley-hello-new-transit/
- https://www.pts.gatech.edu/category/news/page/4/
