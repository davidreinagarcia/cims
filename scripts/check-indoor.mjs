/** @file Checks every indoor level for intersecting spaces and spaces outside its floor outline, without dependencies. */
// Usage: node scripts/check-indoor.mjs
import { readFileSync } from "node:fs";

const EPS = 1e-7;
const TOLERANCE = 0.5; // square plan units; touching edges have zero area

function shapeRings(shape) {
  if (shape.kind === "rect") {
    const { x, y, w, h } = shape;
    if (!(w > 0 && h > 0)) throw new Error("Non-positive room dimensions");
    return [[[x, y], [x + w, y], [x + w, y + h], [x, y + h]]];
  }
  if (shape.kind === "circle") {
    if (!(shape.r > 0)) throw new Error("Non-positive circle radius");
    // Circumscribed polygon: never underestimates the occupied area of a desk.
    const n = 512, r = shape.r / Math.cos(Math.PI / n);
    return [Array.from({ length: n }, (_, i) => [shape.cx + r * Math.cos(2 * Math.PI * i / n), shape.cy + r * Math.sin(2 * Math.PI * i / n)])];
  }
  if (shape.kind !== "polygon") throw new Error(`Unsupported shape: ${shape.kind}`);
  return [shape.points.trim().split(/\s+/).map((p) => p.split(",").map(Number))];
}

function outlineRings(path) {
  if (/[^MLZ\d.,\s-]/i.test(path)) throw new Error("Unsupported outline command (expected M/L/Z)");
  return path.split(/Z/i).filter((ring) => ring.trim()).map((ring) => {
    const values = ring.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    if (values.length % 2) throw new Error("Unpaired outline coordinate");
    return Array.from({ length: values.length / 2 }, (_, i) => values.slice(i * 2, i * 2 + 2));
  });
}

function edges(rings) {
  return rings.flatMap((ring) => {
    if (ring.length < 3 || ring.some((p) => p.length !== 2 || !p.every(Number.isFinite))) throw new Error("Invalid polygon coordinates");
    return ring.map((p, i) => [p, ring[(i + 1) % ring.length]]);
  });
}

// Nonzero winding matches SVG's default fill rule, including multiple outline rings.
function intervals(segments, y) {
  const hits = segments.filter(([[, a], [, b]]) => y > Math.min(a, b) && y < Math.max(a, b))
    .map(([[x1, y1], [x2, y2]]) => ({ x: x1 + (y - y1) * (x2 - x1) / (y2 - y1), wind: y2 > y1 ? 1 : -1 }))
    .sort((a, b) => a.x - b.x);
  const result = [];
  let wind = 0, start = 0;
  for (const hit of hits) {
    if (wind === 0) start = hit.x;
    wind += hit.wind;
    if (wind === 0 && hit.x - start > EPS) result.push([start, hit.x]);
  }
  return result;
}

function intersectionWidth(a, b) {
  let total = 0;
  for (const [l, r] of a) for (const [s, t] of b) total += Math.max(0, Math.min(r, t) - Math.max(l, s));
  return total;
}

// Between vertices and edge crossings the intersected width is linear: midpoint integration is exact.
function areas(a, b) {
  const cuts = [...a, ...b].flatMap(([p, q]) => [p[1], q[1]]);
  for (const [[ax, ay], [bx, by]] of a) for (const [[cx, cy], [dx, dy]] of b) {
    const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
    if (Math.abs(den) < EPS) continue;
    const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den;
    const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den;
    if (t > EPS && t < 1 - EPS && u > EPS && u < 1 - EPS) cuts.push(ay + t * (by - ay));
  }
  const ys = [...new Set(cuts)].sort((x, y) => x - y);
  let overlap = 0, outside = 0;
  for (let i = 1; i < ys.length; i++) {
    const h = ys[i] - ys[i - 1];
    if (h < EPS) continue;
    const aa = intervals(a, (ys[i] + ys[i - 1]) / 2), bb = intervals(b, (ys[i] + ys[i - 1]) / 2);
    const intersection = intersectionWidth(aa, bb);
    overlap += intersection * h;
    outside += (aa.reduce((sum, [l, r]) => sum + r - l, 0) - intersection) * h;
  }
  return { overlap, outside };
}

let failures = 0;
for (const name of ["kendeda", "culc"]) {
  const building = JSON.parse(readFileSync(new URL(`../src/data/indoor/${name}.json`, import.meta.url), "utf8"));
  let overlaps = 0, outside = 0, spaces = 0, levels = 0;
  for (const level of building.levels.filter((item) => item.available)) {
    levels++;
    const outline = edges(outlineRings(level.outline));
    const rooms = level.spaces.map((space) => ({ id: space.id, edges: edges(shapeRings(space.shape)) }));
    spaces += rooms.length;
    rooms.forEach((room, i) => {
      const escaped = areas(room.edges, outline).outside;
      if (escaped > EPS) { outside++; console.error(`${name} level ${level.id}: ${room.id} outside outline (${escaped.toFixed(3)} square units)`); }
      for (const other of rooms.slice(i + 1)) {
        const area = areas(room.edges, other.edges).overlap;
        if (area > TOLERANCE + EPS) { overlaps++; console.error(`${name} level ${level.id}: ${room.id} overlaps ${other.id} (${area.toFixed(3)} square units)`); }
      }
    });
  }
  failures += overlaps + outside;
  console.log(`${name}: ${levels} levels, ${spaces} spaces, ${overlaps} overlaps, ${outside} outside outline`);
}
if (failures) process.exitCode = 1;
else console.log("PASS: 0 overlaps; all spaces inside their level outline (overlap tolerance: 0.5 square units).");
