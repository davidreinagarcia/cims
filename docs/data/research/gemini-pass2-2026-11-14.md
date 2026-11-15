<!-- summary: Audit report of the Gemini deep research pass on campus POIs (2026-11-14): what is solid, what is missing, what to verify. -->
# Gemini POI research, second pass (2026-11-14)

Deep research run by David with Gemini to collect locations and opening hours for every map layer. This is the **audit report only**. The raw GeoJSON files it produced are **not imported yet** and **nothing here is verified**: per project rules, anything imported goes in as `draft` and a person seals it with `npm run data:verify`.

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
| Brittain Dining Hall | Mon to Fri 11:00 to 23:00, closed weekends. No meal period split found, and the "two year renovation, reopened Fall 2026" claim is **not backed** by the retrieved pages. |
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

## Next steps

1. Get the 9 JSON files from David and keep the raw copies out of `src/data/`.
2. Convert to the real schema (`docs/data/README.md`): drop unsupported fields, map `building_name` to `building_id`, remove `null` fields.
3. Deduplicate against existing `src/data/pois/*.json`, keeping existing OSM coordinates.
4. Look up real coordinates for everything new. Never reuse one point for two venues.
5. Import as `draft` with `source_url`, add `support.json` and `transport.json`, run `npm run data:check`, then people verify with `npm run data:verify`.

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
