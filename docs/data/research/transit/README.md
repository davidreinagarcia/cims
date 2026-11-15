<!-- summary: Bus data for the map: how to get Stinger routes, stops and live positions from the campus tracker, and what we captured on 2026-11-14. -->
# Campus buses: routes, stops and live data

Everything the map needs to draw the Stinger network. Captured on **2026-11-14** (a Saturday).

## Where the data comes from

`https://bus.gatech.edu/routes` is the public live tracker ("Ride Systems Live Tracker", not TransLoc). The page is a front end over a relay service:

```
https://bus.gatech.edu/Services/JSONPRelay.svc/<Endpoint>
```

It is **not an official developer API**. There is no documentation, no published terms and no key, and it can change without notice. It is the same service every visitor of the tracker uses.

| Endpoint | Returns |
| --- | --- |
| `GetRoutesForMapWithScheduleWithEncodedLine` | Every route: id, name, color, schedule text, encoded line, stops in order (tested) |
| `GetStops` | Every stop, with its route and the points of its approach (tested) |
| `GetMapVehiclePoints` | Live vehicle positions (found in the tracker code, not tested) |
| `GetStopArrivalTimes`, `GetVehicleRouteStopEstimates` | Arrival estimates per stop or vehicle (not tested) |
| `GetVehicleCapacities` | Vehicle occupancy (not tested) |
| `GetRouteGroupsWithRoutes`, `GetMapConfig` | Route groups and map settings (not tested) |

All are plain GET requests. The tracker front end also contains an `oauth/token` call for a second API style; we do not use it and do not document its credentials.

Route and stop ids look like `TL-29`, which suggests PTS also keeps a GTFS feed on TransLoc. The only public GTFS we found (MobilityData `mdb-355`) is from 2013 to 2014 and is useless. For a lasting integration, ask PTS (404-385-7275) for the current feed.

## What is in this folder

| File | What |
| --- | --- |
| `routes.geojson` | 9 routes as `LineString`, with `name`, `color`, `gtfs_id`, `schedule_text` |
| `stops.geojson` | 126 route stops as `Point`, one per route and stop, in route order |
| `fetch-transit.mjs` | Rebuilds both files. `node fetch-transit.mjs` (live) or `--from-dir DIR` (saved relay JSON). No dependencies, Node 18+ |

Not wired into the app. `src/` does not read these files yet.

## Routes captured and what PTS says

The "Tracker text" column is what the relay returns, copied as is. The "PTS Fall 2026" column is the weekday span from PTS's own page, [Transportation Update for Fall 2026](https://www.pts.gatech.edu/2026/08/17/transportation-update-for-fall-2026/). That page is the newer source and wins when the two differ. Cross check by Codex, spot checked by us against the PTS page.

| Route | `route_id` | Tracker text | PTS Fall 2026 (Mon to Fri) | Stops |
| --- | --- | --- | --- | ---: |
| Red | 20 | Red 1: 7:00am to 10:00pm, Red 2: 7:30am to 8:00pm, Red 3: 7:15am to 5:00pm | 7:00 to 22:00 | 18 |
| Blue | 21 | Blue 1: 7:00am to 10:00pm, Blue 2: 7:20am to 8:00pm, Blue 3: 7:15am to 5:00pm | 7:00 to 22:00 | 13 |
| Green | 17 | Green 1: 6:45am to 7:00pm, Green 2: 8:15am to 7:00pm | 6:45 to 19:00 | 10 |
| Emory | 18 | 7:15am to 7:15pm | 7:15 to 19:15 | 11 |
| Gold | 29 | Gold 1 to 4, from 5:15am to 12:00am | 5:15 to midnight | 21 |
| Clough | 28 | Clough 1: 7:00am to 5:30pm, Clough 2: 7:45am to 10:00pm, Clough 3: 10:00am to 12:00am | 7:30 to midnight | 11 |
| Northside Dr. to Atlantic Station | 26 | 7:15am to 7:00pm | 7:15 to 19:00 | 9 |
| Weekend Atlantic Station | 23 | 12:00pm to 4:30pm | Sat and Sun 12:00 to 16:30, every 45 min | 15 |
| Weekend Midtown | 24 | 12:00pm to 4:30pm | Sat and Sun 12:00 to 16:30, every 45 min | 18 |
| Charter | 11 | none | not a public route, no line, no stops | 0 |

Other service from PTS:

- **Red, Blue and Gold on weekends:** Sat and Sun 20:00 to midnight, every 25 minutes. They are not separate routes in the feed.
- **Stingerette on demand:** every day 16:30 to 23:59 (the Stinger page and the update differ slightly on coverage, so check before quoting).
- **Yellow Jacket Voucher (Uber):** midnight to 3:00 a.m. This replaces the old late night service.
- **3:15 a.m. service is over.** The 2025 notice said Gold, Red and Blue would run until 3:15 a.m. The Fall 2026 update replaced that, and the 3:15 text does not appear on the current page.

Two small disagreements remain between the tracker and PTS: Clough starts at 7:00 in the tracker and 7:30 at PTS, and Blue's second bus starts at 7:20 in the tracker while the PTS table implies 7:30. Midnight Rambler and the NARA Science Square route are not in the feed, which agrees with PTS.

## Things to know before using it

- **Bounds.** Emory and the Atlantic Station routes leave the campus box (lon -84.42 to -84.375, lat 33.76 to 33.79) that the POI validator uses. 10 stops and about 1,950 line points are outside it. If the map clamps its view to the campus, these routes get cut.
- **Loops.** Each line starts and ends at the same point. Stops are listed in route order, not as a path.
- **Duplicates.** 126 stops are 66 distinct places, because a stop shared by several routes appears once per route. Dedupe by coordinates for a stop layer.
- **Inactive routes.** The capture was a Saturday, and only Red, Blue, Gold and the Charter had `IsRunning: true`. This is a live flag and says nothing about the timetable, and the Charter has no line even though it is flagged running.
- **Be polite.** Fetch once and commit the result (what this folder does) instead of calling the relay from every visitor's browser. Only live vehicle positions need the relay at run time.

## Refreshing

```
node docs/data/research/transit/fetch-transit.mjs
```

Compare the route list and hours with https://www.pts.gatech.edu/shuttles/stinger/ after each refresh. Routes and hours change every semester.
