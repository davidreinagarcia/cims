<!-- summary: Codex verification of the doubtful items from the Gemini research, with our review: what was confirmed, corrected or left open. -->
# Codex review of the Gemini research (2026-11-14)

Four Codex tasks re-checked the points we doubted in the Gemini output, against official pages. The files here are Codex's own notes. **They are in Spanish**, each item has a `status` (`confirmed`, `corrected`, `unconfirmed`), the source URL and a short quote. We reviewed the summaries and spot checked the most important claim (the PTS Fall 2026 bus hours). We did not re-open every source.

Nothing here is verified in the project sense. Records stay `draft` until a person runs `npm run data:verify`.

## Where things are

| Task | Notes | Data |
| --- | --- | --- |
| Hours, CRC, dining, printing (items 1 to 9) | [`reports/hours-conflicts-report.md`](reports/hours-conflicts-report.md) | `01-` to `09-` `*-*.json` and `.md` |
| Office locations (18 offices) | [`offices-review-index.md`](offices-review-index.md) | `01-` to `18-` files, [`offices-validation.json`](offices-validation.json) |
| OSM coordinates for new venues | [`osm-coordinates.md`](osm-coordinates.md) | [`osm-coordinates.json`](osm-coordinates.json) |
| Bus hours and feed cross check | [`transit.md`](transit.md) | [`transit.json`](transit.json) |

The numbered files overlap: the hours task wrote `01-` to `09-` and the offices task wrote `01-` to `18-`. Use the two index files above to tell them apart.

## Gemini claims, after checking

| Claim | Result |
| --- | --- |
| Brittain reopened in Fall 2026 after a two year renovation | **True.** Reopened 17 Aug 2026, 649 Techwood Dr NW, Mon to Fri 11:00 to 23:00, no breakfast, no weekends. No lunch and dinner split found. We doubted this earlier and were wrong. |
| Print Studio: Saturday 12:00 to 18:00, Sunday 10:00 to 22:00 | **True.** The asymmetry is in the official page. |
| CRC opens 09:00 on Sunday | **True** for Fall 2026 (CRC pages are labelled Fall 2026). A central page says 10:00 and is the one that is wrong or old. |
| Registrar hours 08:00 to 16:30 | **Wrong for the main office.** 09:00 to 16:00, Tech Tower, 225 North Avenue, first floor (building 035). The 08:00 to 16:30 belongs to the veterans certification team (Room 104). We corrected our data. |
| Library address 260 4th St NW | **True.** Price Gilbert and Crosland share it (Facilities numbers 077 and 100). The older "704 Cherry St" is not supported. |
| Veterans Resource Center at 311 Ferst Dr, Biotech Quad | **Supported.** The exact building is still unknown (Facilities links that address to ES&T 147, which does not prove the VRC is there). |
| Wellness Empowerment Center, 08:00 to 17:00 | **Partly.** Suite 204, Joseph B. Whitehead Student Health Center (building 177, 740 Ferst Dr). The contact page says Thursday opens 09:00, another page says 08:00. We left Thursday out. |
| Belonging & Student Support in Smithgall Suite 140 | **Conflict.** Official page says Suite 102 A and B. |
| Stamps pharmacy lunch closure | **Conflict between two official pages** (12:30 to 13:30 vs 12:00 to 12:30). Not imported. |
| Conference Dining Room open to the public | **Not confirmed.** Tech Dining and the hotel give different hours and nothing says non guests can eat there. |
| Moe's Midtown hours | **Two official sources differ** (operator Monday 10:00 to 23:00, Tech Dining 10:30 to 22:00). Not imported. |
| Clough and Crosland printers 24/7 | **Not confirmed.** The buildings are open 24 hours when school is in session (BuzzCard 18:00 to 07:00), but no page says the printers are. |
| Waffle House Tech Square 24 hours | Likely. Its page says "Open 24 Hours" for 14 Nov. Not imported. |
| Gold, Red and Blue run until 3:15 a.m. | **Out of date.** Fall 2026: Gold until midnight, Red and Blue until 22:00. |

Not found at all: Career Center hours, SGA office, OMED status (pages blocked or login only), Starbucks hours, CRC Fitness Floor, Indoor Track and Main Gymnasium hours (they have no schedule of their own), Tech Square Tavern (two official tables disagree).

## OSM coordinates

Of 38 venues, 16 have their own OSM object (exact), 12 only a building centroid, 10 are unresolved. All 28 points are different and inside the campus box. The exact ones are the safest to import: Boho Taco, Moe's, Ray's Pizza, Sankranti, Tin Drum, Ken Byers Tennis Complex, GTPD, Student Competition Center, both MARTA stations, Kessler Campanile, Tech Green, Ferst Center, McCamish, Bobby Dodd, Exhibition Hall.

Watch out:

- Ray's Pizza and Cedar's Mediterranean share one OSM node.
- Building centroids put every venue of a building on the same spot. Use them only when there is nothing better.
- Visitor parking areas 10 and 12 are not where the Gemini notes put them (IPST/RAB W31). PTS places them elsewhere.
- Unresolved: BuzzCard Center, Belonging & Student Support, CRC Bike Shop, Tech Square Tavern, IDEA Lab, parking areas 4, 10, 11, 12, EV charging at area 4.
- The Library Audio Recording Studio is listed as closed for repairs.

## What we changed in the data because of this review

- `office-registrar`: hours now 09:00 to 16:00, weekdays only.
- `wellness-empowerment-center`: Thursday removed until the conflict is settled.
- `crc-climbing-wall`: weekend days removed (only staffed weekday hours are published).

In this app a day without hours shows "Unknown", never "Closed". Leave a day out when the source does not say.

## Next steps

1. Add the venues with exact OSM points as `draft` records (with their hours where Codex confirmed one).
2. Ask PTS for the bus GTFS feed (see [`../transit/README.md`](../transit/README.md)).
3. Someone on campus checks the open items: Career Center, SGA, OMED, Starbucks, VRC building, Belonging suite.
