/** @file Building footprints (OSM, src/data/buildings.geojson): loaded once on demand, with a point-in-footprint lookup shared by the 3D layer, the building card and place selection. */
import buildingsUrl from "../data/buildings.geojson?url";

/** One building footprint with the facts we know about it. Rings are [lng, lat] lists; ring 0 is the outline, the rest are courtyards. */
export interface Building {
  id: string;
  name?: string;
  aliases: string[];
  address?: string;
  /** Extrusion height in meters; see heightSource for how trustworthy it is. */
  height: number;
  heightSource: string;
  levels?: number;
  /** OSM element like "way/42706702". */
  osmId?: string;
  polygons: number[][][][];
  bbox: [number, number, number, number];
  /** Middle of the bounding box: where to fly to and where directions point. */
  center: [number, number];
}

/** Every building, by id, plus a lookup of the building that contains a point. */
export interface BuildingIndex {
  byId: Map<string, Building>;
  list: Building[];
  /** The building whose footprint contains the point, if any. */
  at: (lng: number, lat: number) => Building | undefined;
}

type Props = { id: string; name?: string; aliases?: string[]; address?: string; height?: number; height_source?: string; levels?: number; osm_id?: string };
type Footprint = GeoJSON.Polygon | GeoJSON.MultiPolygon;

function ringContains(ring: number[][], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function contains(b: Building, x: number, y: number): boolean {
  if (x < b.bbox[0] || x > b.bbox[2] || y < b.bbox[1] || y > b.bbox[3]) return false;
  return b.polygons.some(([outer, ...holes]) => ringContains(outer, x, y) && !holes.some((hole) => ringContains(hole, x, y)));
}

function build(fc: GeoJSON.FeatureCollection<Footprint, Props>): BuildingIndex {
  const list: Building[] = [];
  for (const f of fc.features) {
    if (!f.geometry || (f.geometry.type !== "Polygon" && f.geometry.type !== "MultiPolygon")) continue;
    const polygons = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [outer] of polygons) {
      for (const [x, y] of outer) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    const p = f.properties;
    list.push({
      id: p.id, name: p.name, aliases: p.aliases ?? [], address: p.address, height: p.height ?? 10, heightSource: p.height_source ?? "default",
      levels: p.levels, osmId: p.osm_id, polygons, bbox: [minX, minY, maxX, maxY], center: [(minX + maxX) / 2, (minY + maxY) / 2],
    });
  }
  const byId = new Map(list.map((b) => [b.id, b]));
  return { byId, list, at: (lng, lat) => list.find((b) => contains(b, lng, lat)) };
}

let loaded: BuildingIndex | null = null;
let pending: Promise<BuildingIndex> | null = null;

/** The index if it is already loaded, so callers can answer synchronously. */
export function loadedBuildings(): BuildingIndex | null {
  return loaded;
}

/** Loads the footprints once; a failed load is forgotten so the next call retries. */
export function loadBuildings(): Promise<BuildingIndex> {
  pending ??= fetch(buildingsUrl)
    .then((r) => {
      if (!r.ok) throw new Error(`buildings.geojson: HTTP ${r.status}`);
      return r.json();
    })
    .then((fc) => (loaded = build(fc)))
    .catch((err) => {
      pending = null;
      throw err;
    });
  return pending;
}
