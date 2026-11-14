<!-- summary: GT Buses endpoint checks, CORS evidence, unavailable GT data, and transport-layer recommendation. -->
# T-09: GT Buses API investigation

Verified by: Codex, 2026-11-14. Network observations below are a small point-in-time sample, not an uptime study. All listed source URLs were opened; the endpoint observations used curl.

## Decision for CIMS

**Do not integrate this service for Georgia Tech data.** The routes, vehicles, and predictions requests all returned an application-level invalid-agency error, despite HTTP 200. No usable stops, shapes, vehicle positions, or arrival predictions were obtained. [Routes](https://gtbuses.herokuapp.com/api/v1/agencies/georgia-tech/routes), [vehicles](https://gtbuses.herokuapp.com/api/v1/agencies/georgia-tech/vehicles), [predictions](https://gtbuses.herokuapp.com/api/v1/agencies/georgia-tech/predictions).

Consequently, this task creates neither `scripts/fetch-transit.mjs` nor `src/data/transit.geojson`: the documented static-data endpoint does not currently supply GT data. It also omits `src/lib/transit.ts`: CORS passed the sampled GET checks, but live GT data did not. Do not convert an error response into an empty transit snapshot or represent missing predictions as zero wait time.

## Documented interface versus observed behavior

The [documentation](https://gtbuses.herokuapp.com/) describes a NextBus wrapper, warns that GT support ended on February 22, 2019, and directs users to Passio. It lists these endpoints under `/api/v1/agencies/<agency>`:

| GET suffix | Documented purpose | This investigation |
| --- | --- | --- |
| `/routes` | Route configuration, stops, paths | Requested with `georgia-tech`; invalid-agency error |
| `/vehicles` | Vehicle locations | Same error |
| `/predictions` | Agency predictions | Same error |
| `/messages` | General/route messages | Documented only; not requested |
| `/multiPredictions?stops=blue\|cherfers` | Predictions for selected stops | Documented example only; not requested |

The same [documentation](https://gtbuses.herokuapp.com/) specifies JSON by default and an `.xml` suffix for XML, with statuses 200/400/404/502. XML was not tested. Its historical vehicle example contains `vehicle[]` (`id`, `lat`, `lon`, `routeTag`, `secsSinceReport`) and `lastTime.time`; these are example fields, not a verified current success schema. No successful stop, path, or prediction schema was obtained. In particular, stop coordinates, route membership, path ordering, and geometry encoding remain unverified.

## Small read-only probe log

Commands run on 2026-11-14, with a 25–30 second maximum per request, no retries, and no load testing. Two documentation GETs were followed by these four API GETs. The second routes request checked a different origin; `https://cims.example` is a test Origin header, not an asserted deployment URL.

```sh
curl -sS --max-time 30 -i -H 'Origin: http://localhost:5173' \
  https://gtbuses.herokuapp.com/
curl -sS --max-time 25 https://gtbuses.herokuapp.com/
curl -sS --max-time 25 -i -H 'Origin: http://localhost:5173' \
  https://gtbuses.herokuapp.com/api/v1/agencies/georgia-tech/routes
curl -sS --max-time 25 -i -H 'Origin: http://localhost:5173' \
  https://gtbuses.herokuapp.com/api/v1/agencies/georgia-tech/vehicles
curl -sS --max-time 25 -i -H 'Origin: http://localhost:5173' \
  https://gtbuses.herokuapp.com/api/v1/agencies/georgia-tech/predictions
curl -sS --max-time 25 -i -H 'Origin: https://cims.example' \
  https://gtbuses.herokuapp.com/api/v1/agencies/georgia-tech/routes
```

The three API responses at 20:46:48 GMT shared these headers and this body (transport/reporting headers omitted; JSON formatting added). The repeated [routes GET](https://gtbuses.herokuapp.com/api/v1/agencies/georgia-tech/routes) at 20:47:18 GMT returned the same body with `access-control-allow-origin: https://cims.example`.

```http
HTTP/2 200
access-control-allow-origin: http://localhost:5173
content-type: application/json;charset=ISO-8859-1
date: Sat, 14 Nov 2026 20:46:48 GMT
vary: Origin
```

```json
{
  "copyright": "All data copyright agencies listed below and Umo IQ 2026.",
  "Error": [
    {"shouldRetry": "false", "content": "Agency parameter \"a=georgia-tech\" is not valid."},
    {"shouldRetry": "false", "content": "Agency parameter \"a=georgia-tech\" is not valid."}
  ]
}
```

Sources for the shared error body and localhost-origin headers: [routes](https://gtbuses.herokuapp.com/api/v1/agencies/georgia-tech/routes), [vehicles](https://gtbuses.herokuapp.com/api/v1/agencies/georgia-tech/vehicles), [predictions](https://gtbuses.herokuapp.com/api/v1/agencies/georgia-tech/predictions). An HTTP status check alone would incorrectly mark these as working data feeds; a future importer/client must inspect the response body too.

## CORS, uptime, and freshness

- **Browser GET:** the tested API responses echoed the supplied Origin and included `Vary: Origin`. Inference: a simple browser GET without credentials or custom headers should be readable from the two tested origins. A proxy is unnecessary for that narrow CORS case; this was a curl header check, not an executed browser test. Credentials, preflights, other origins, and untested endpoints remain unverified. Sources: [routes](https://gtbuses.herokuapp.com/api/v1/agencies/georgia-tech/routes), [vehicles](https://gtbuses.herokuapp.com/api/v1/agencies/georgia-tech/vehicles), [predictions](https://gtbuses.herokuapp.com/api/v1/agencies/georgia-tech/predictions).
- **Availability:** the documentation and sampled endpoints responded during the probe window. That establishes HTTP availability only, not GT feed health, uptime history, or an SLA. The repeated routes error persisted across the two checks. [Documentation](https://gtbuses.herokuapp.com/), [routes](https://gtbuses.herokuapp.com/api/v1/agencies/georgia-tech/routes).
- **Freshness:** no GT observation timestamps were returned. A current HTTP `Date` and a 2026 copyright in an error body do not establish fresh transit data. The documentation GET had `Last-Modified: Tue, 05 Dec 2023 03:27:20 GMT`; this describes the documentation asset, not vehicle freshness. [Routes](https://gtbuses.herokuapp.com/api/v1/agencies/georgia-tech/routes), [documentation](https://gtbuses.herokuapp.com/).

## Agencies and official direction

| Service | What is supported by opened sources |
| --- | --- |
| GT Stinger / Tech Trolley | The wrapper's documented GT slug fails today; no current routes or named-service coverage can be established from its response. [GT routes probe](https://gtbuses.herokuapp.com/api/v1/agencies/georgia-tech/routes). |
| Stingerette | No working feed or separate agency slug was verified in this wrapper. Georgia Tech's August 1, 2022 announcement describes TransLoc for Stinger tracking and on-demand Stingerette access. [Official announcement](https://students.gatech.edu/news/parking-transportation-services-introduces-new-bus-tracking-app). |
| Atlanta MARTA | No MARTA agency slug or data was verified; do not imply that the wrapper supplies MARTA. The opened wrapper documentation offers only GT examples. [Documentation](https://gtbuses.herokuapp.com/). |

The official [2022 announcement](https://students.gatech.edu/news/parking-transportation-services-introduces-new-bus-tracking-app) says TransLoc replaced Passio Go, so the wrapper's Passio migration advice is historical. The same announcement links [bus.gatech.edu](https://bus.gatech.edu/); opening that address yielded a JavaScript application shell titled “Ride Systems Live Tracker,” without inspectable transit data. These sources provide a follow-up direction, not proof of a currently usable public API.

## Terms and map recommendation

No API-specific reuse license, published quota, polling interval, or SLA was found on the opened [documentation page](https://gtbuses.herokuapp.com/). The [observed API error](https://gtbuses.herokuapp.com/api/v1/agencies/georgia-tech/routes) asserts copyright for agencies and Umo IQ. Public accessibility and CORS are not evidence of permission to redistribute data; reuse terms remain **Unverified**.

Recommendation: obtain a current, permitted static stops/routes source through Georgia Tech's official transit channel first. Prefer a reviewed snapshot for the hackathon until schema, service currency, and reuse terms are verified. Preserve real stop coordinates and actual route shapes; do not infer LineStrings by joining stop locations. Each eventual feature should retain `source_url`, `verified_at`, and `verified_by` as required by this repo, plus the requested stop fields. This is a proposed workflow, not an available dataset.

Do not poll this legacy wrapper for CIMS. A proxy cannot restore its invalid GT agency. Reconsider live integration only after verifying successful vehicle/prediction payloads, timestamps, browser CORS on the deployed origin, and provider polling terms. For now, an official tracker link is the supported user-facing fallback: [bus.gatech.edu](https://bus.gatech.edu/).

## Unverified / open

- Current stop coordinates, route IDs/names, memberships, shapes, schedules, and GT live positions/ETAs.
- Historical Stinger/Tech Trolley coverage and any distinct Stingerette or MARTA agency slug in this wrapper; no speculative agency probes were made.
- Successful routes/predictions schemas, XML behavior, messages, and multi-stop prediction behavior.
- Uptime history, maintenance status, refresh cadence, rate limits, redistribution license, and attribution obligations.
- A current supported replacement API or static export, its terms, and its production-origin CORS behavior; the official tracker shell and the historical TransLoc announcement do not settle these questions.

No coordinates, route geometries, or live observations from historical examples were copied into CIMS data.
