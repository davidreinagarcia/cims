# Architecture Decision Records

We record every significant technical decision as an ADR, following a lightweight
[MADR](https://adr.github.io/madr/) format.

## Rules

1. One decision per file: `NNNN-short-title.md`, numbered sequentially.
2. Copy [`0000-template.md`](0000-template.md) to start.
3. Status lifecycle: **Proposed → Accepted** → (optionally) **Deprecated** or **Superseded by ADR-XXXX**.
4. Accepted ADRs are **immutable**. To change a decision, write a new ADR that supersedes the old one,
   and update the old one's status line only.
5. ADRs are merged through a normal PR; the Tech Lead approves.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0002](0002-web-spa-vite-react.md) | Web SPA with Vite + React + TypeScript, self-hosted with auto-deploy | Accepted |
| [0003](0003-maplibre-2d-with-3d-extrusion.md) | MapLibre GL JS with 3D extrusion for the campus map | Accepted (MapLibre) · Proposed (3D) |
| [0004](0004-curated-data-as-versioned-geojson.md) | Curated campus data as versioned GeoJSON in the repo | Proposed |
| [0005](0005-backend-supabase.md) | Supabase for user-generated data | Proposed |
