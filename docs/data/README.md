<!-- summary: Schema and evidence-based workflow for curated campus POI data. -->
# Curated POI data

`scripts/data.mjs` runs on Node 18 and 22 with no dependencies. It reads
`src/data/places.json` and every `src/data/pois/*.json` file. Each file is a GeoJSON
`FeatureCollection` of `Feature` objects with `Point` geometry and exactly two
coordinates, `[longitude, latitude]`. Campus bounds are longitude −84.42 to −84.375
and latitude 33.76 to 33.79, inclusive.

## Properties

| Field | Meaning |
| --- | --- |
| `id` | Required nonempty kebab-case string, unique across all files. |
| `name`, `category`, `status` | Required nonempty strings. Categories come directly from `LAYER_CATALOG` in `src/lib/layerCatalog.ts`, plus `landmark`, `academic`, `housing`, `other`. |
| `subtype` | Optional string. If the category defines subtypes in the catalog, use one of those ids. |
| `aliases` | Optional array of strings used for alternative names. |
| `description`, `address`, `building_id` | Optional nonempty strings. Missing descriptions produce warnings. |
| `url` | Optional absolute HTTPS URL for the place. |
| `source_url` | Absolute HTTPS URL supporting the record; required for drafts and verified records. |
| `verified_at`, `verified_by` | Real date in `YYYY-MM-DD` format and nonempty verifier name. Required for verified records, forbidden on drafts. Dates older than 180 days produce warnings. |
| `hours` | Optional object with `mon` through `sun` keys. Each day holds an array of `["HH:MM", "HH:MM"]` pairs in local campus time; opening must be 00:00..23:59 and precede closing; only closing accepts `24:00` (end of day). `event.weekly` still accepts only 00:00..23:59. An empty array means no opening intervals. Split overnight hours between days. |
| `buzzcard` | Optional object with `required` (boolean) and optional `note` (nonempty string). |

For `coord_precision: "building"`, `building_id` must reference a real feature id in
`src/data/buildings.geojson`. Keep `floor_or_room` when supplied by the source; never
guess it. The required Point is the building centroid, not an exact POI location.
Map pins group these records by building and category. David's curated hours win
when research disagrees; usable research hours fill missing hours only.

## Statuses

* `seed`: approximate starting data, allowed without provenance. Verify it against evidence before relying on it.
* `draft`: sourced data awaiting a person's checks. Requires `source_url` and cannot carry verification fields.
* `verified`: a person has checked the record against its source. Requires all three provenance fields.

Drafts are hidden from the map unless the URL has `?drafts=1`.

## Verification workflow

1. Run `npm run data:list` and open [UNVERIFIED.md](UNVERIFIED.md). It contains only records explicitly marked `draft` or `seed`, grouped by category and sorted by id.
2. Open the source, then check the address, hours, BuzzCard requirements and point coordinates using the linked OpenStreetMap location. For building-precision records, check building + floor instead: confirm the building association and any sourced floor/room; an exact point is not required for `data:verify`. Find an authoritative HTTPS source for entries marked `NO SOURCE`. Correct the JSON from evidence; never guess missing data.
3. Run the entry's command, for example `npm run data:verify -- example-place --by david --source https://example.edu/place`. The command accepts only seeds or drafts, preserves existing properties, sets `status` to `verified` and records the verifier and today's UTC date. Use `--date YYYY-MM-DD` to record another verification date. `--source` can replace an existing source and is required if none exists. Invalid resulting records and ambiguous ids are refused without writing.
4. Run `npm run data:check`, regenerate `npm run data:list`, review the JSON and checklist diff, and commit them together. Verification rewrites the containing file with two-space JSON indentation and a trailing newline. CI runs the validator after the index check; errors fail CI, warnings do not.

For isolated fixtures, all three commands accept `--data-dir DIR`. It must contain
`places.json` and may contain `pois/*.json`; the catalog always comes from the repo.
`list` always writes the repository's `docs/data/UNVERIFIED.md`.
