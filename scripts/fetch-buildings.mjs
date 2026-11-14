#!/usr/bin/env node
/** @file Fetches Georgia Tech building footprints from OpenStreetMap (Overpass) into src/data/buildings.geojson (T-03). */
// Usage: node scripts/fetch-buildings.mjs [--from <overpass.json>]
//   Downloads every building inside the OSM area "Georgia Institute of Technology" (amenity=university),
//   converts it to GeoJSON polygons with an id, name, aliases and a height for 3D extrusion, applies the
//   hand-curated corrections in src/data/buildings.overrides.json, and writes a deterministic, sorted file.
//   --from reuses a saved Overpass response (no network), handy for re-running after editing overrides.
// Data © OpenStreetMap contributors, ODbL. The map UI must keep the OSM attribution visible.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const ROOT = execSync("git rev-parse --show-toplevel").toString().trim();
const OUT = join(ROOT, "src/data/buildings.geojson");
const OVERRIDES = join(ROOT, "src/data/buildings.overrides.json");
const ENDPOINT = "https://overpass-api.de/api/interpreter";
const METERS_PER_LEVEL = 3.5;
const DEFAULT_HEIGHT = 10; // used only when OSM has neither height nor building:levels
const PRECISION = 1e6; // 6 decimals ≈ 0.1 m: plenty for footprints, keeps the file small

const QUERY = `[out:json][timeout:120];
area["name"="Georgia Institute of Technology"]["amenity"="university"]->.gt;
(way["building"](area.gt); relation["building"]["type"="multipolygon"](area.gt););
out tags geom;`;

/** Downloads the Overpass response, or reads it from --from <file>. */
async function loadOverpass() {
  const i = process.argv.indexOf("--from");
  if (i > 0) return JSON.parse(readFileSync(process.argv[i + 1], "utf8"));
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "User-Agent": "cims-hackathon (github.com/davidreinagarcia/cims)", "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(QUERY),
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

/** Turns a building name into a stable, URL-safe id (e.g. "Kendeda Building" → "kendeda-building"). */
function slug(s) {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

/** Parses OSM height values like "23", "23 m", "75'" into meters; returns null if unusable. */
function parseHeight(v) {
  if (!v) return null;
  const ft = v.match(/^([\d.]+)\s*(ft|')$/i);
  if (ft) return +(parseFloat(ft[1]) * 0.3048).toFixed(1);
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const round = ([lon, lat]) => [Math.round(lon * PRECISION) / PRECISION, Math.round(lat * PRECISION) / PRECISION];
const ring = (geom) => {
  const r = geom.map((p) => round([p.lon, p.lat]));
  const [a, b] = [r[0], r[r.length - 1]];
  if (a[0] !== b[0] || a[1] !== b[1]) r.push(a);
  return r;
};

/** Ray-casting point-in-ring test, used to attach inner rings (courtyards) to their outer ring. */
function inside([x, y], r) {
  let hit = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Converts one Overpass element (way or multipolygon relation) into a GeoJSON geometry, or null. */
function toGeometry(el) {
  if (el.type === "way") return el.geometry?.length >= 4 ? { type: "Polygon", coordinates: [ring(el.geometry)] } : null;
  const outers = el.members.filter((m) => m.role === "outer" && m.geometry?.length >= 4).map((m) => [ring(m.geometry)]);
  const inners = el.members.filter((m) => m.role === "inner" && m.geometry?.length >= 4).map((m) => ring(m.geometry));
  for (const r of inners) outers.find((poly) => inside(r[0], poly[0]))?.push(r);
  if (!outers.length) return null;
  return outers.length === 1 ? { type: "Polygon", coordinates: outers[0] } : { type: "MultiPolygon", coordinates: outers };
}

const data = await loadOverpass();
const overrides = existsSync(OVERRIDES) ? JSON.parse(readFileSync(OVERRIDES, "utf8")).buildings ?? [] : [];
const today = new Date().toISOString().slice(0, 10);
const used = new Set();
const features = [];

for (const el of data.elements ?? []) {
  const geometry = toGeometry(el);
  if (!geometry) continue;
  const t = el.tags ?? {};
  const osm = `${el.type}/${el.id}`;
  const name = t.name ?? null;
  let id = name ? slug(name) : `osm-${el.type[0]}${el.id}`;
  if (used.has(id)) id = `${id}-${el.type[0]}${el.id}`;
  used.add(id);

  const levels = parseInt(t["building:levels"], 10) || null;
  const h = parseHeight(t.height);
  const props = {
    id,
    name,
    aliases: [...new Set([t.short_name, t.alt_name, t.official_name, t.loc_name].filter(Boolean).flatMap((a) => a.split(";").map((s) => s.trim())))],
    height: h ?? (levels ? +(levels * METERS_PER_LEVEL).toFixed(1) : DEFAULT_HEIGHT),
    height_source: h ? "osm:height" : levels ? "osm:levels" : "default",
    levels,
    min_height: parseHeight(t.min_height) ?? 0,
    address: [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ") || null,
    osm_id: osm,
    source_url: `https://www.openstreetmap.org/${osm}`,
    fetched_at: today,
    verified_at: null, // set via overrides once a person checks name/height against a primary source
    verified_by: null,
  };

  // Hand-curated corrections win over OSM (matched by osm_id first, then exact OSM name).
  const o = overrides.find((x) => x.match?.osm_id === osm) ?? overrides.find((x) => name && x.match?.name === name);
  if (o) {
    o._used = true;
    for (const [k, v] of Object.entries(o.set ?? {})) props[k] = k === "aliases" ? [...new Set([...props.aliases, ...v])] : v;
    if (o.set?.height != null) props.height_source = "override";
    Object.assign(props, { verified_at: o.verified_at ?? null, verified_by: o.verified_by ?? null });
  }
  features.push({ type: "Feature", id, properties: props, geometry });
}

features.sort((a, b) => a.properties.id.localeCompare(b.properties.id));
const out = {
  type: "FeatureCollection",
  _note: "Generated by scripts/fetch-buildings.mjs from OpenStreetMap (ODbL). Don't hand-edit: put corrections in buildings.overrides.json and re-run.",
  attribution: "© OpenStreetMap contributors",
  generated_at: today,
  features,
};
writeFileSync(OUT, JSON.stringify(out) + "\n");

const named = features.filter((f) => f.properties.name).length;
const src = features.reduce((m, f) => ((m[f.properties.height_source] = (m[f.properties.height_source] ?? 0) + 1), m), {});
console.log(`buildings.geojson: ${features.length} buildings (${named} named) · heights ${JSON.stringify(src)} · ${(JSON.stringify(out).length / 1024).toFixed(0)} KB`);
for (const o of overrides.filter((x) => !x._used)) console.warn(`⚠️ override matched nothing: ${JSON.stringify(o.match)}`);
