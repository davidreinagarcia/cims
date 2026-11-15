/** @file Indoor plan helpers shared by the plan, the stack view and the building screen: shape bounds, room categories, labels. */
import type { IndoorBuilding, IndoorLevel, IndoorShape, IndoorSpace, IndoorSpaceType } from "../indoor/types";

type Point = [number, number];

function shapePoints(shape: IndoorShape): Point[] {
  if (shape.kind === "polygon") return shape.points.trim().split(/\s+/).map((p) => p.split(",").map(Number) as Point);
  if (shape.kind === "rect") return [[shape.x, shape.y], [shape.x + shape.w, shape.y], [shape.x + shape.w, shape.y + shape.h], [shape.x, shape.y + shape.h]];
  return Array.from({ length: 64 }, (_, i) => [shape.cx + shape.r * Math.cos(i * Math.PI / 32), shape.cy + shape.r * Math.sin(i * Math.PI / 32)]);
}

/** Largest axis-aligned rectangle wholly inside a room, including concave rooms with notches. */
export function planLabelBounds(shape: IndoorShape): { x: number; y: number; w: number; h: number } {
  if (shape.kind === "rect") return planShapeBounds(shape);
  const points = shapePoints(shape);
  const ys = [...new Set(points.map((p) => p[1]))].sort((a, b) => a - b);
  const bands = ys.slice(1).map((bottom, i) => {
    const top = ys[i], spans: [number, number][] = [];
    // Sample both ends of each band: a rectangle must also fit a sloping wall at its narrow end.
    for (const y of [top + 1e-8, bottom - 1e-8]) {
      const xs = points.flatMap(([x1, y1], j) => {
        const [x2, y2] = points[(j + 1) % points.length];
        return y > Math.min(y1, y2) && y < Math.max(y1, y2) ? [x1 + (y - y1) * (x2 - x1) / (y2 - y1)] : [];
      }).sort((a, b) => a - b);
      const next: [number, number][] = [];
      for (let j = 0; j + 1 < xs.length; j += 2) next.push([xs[j], xs[j + 1]]);
      if (!spans.length) spans.push(...next);
      else {
        const intersection = spans.flatMap(([a, b]) => next.flatMap(([c, d]): [number, number][] => Math.min(b, d) > Math.max(a, c) ? [[Math.max(a, c), Math.min(b, d)]] : []));
        spans.splice(0, spans.length, ...intersection);
      }
    }
    return { top, bottom, spans };
  });
  let best = { x: 0, y: 0, w: 0, h: 0 };
  for (let i = 0; i < bands.length; i++) {
    let spans = bands[i].spans;
    for (let j = i; j < bands.length && spans.length; j++) {
      spans = spans.flatMap(([a, b]) => bands[j].spans.flatMap(([c, d]): [number, number][] => Math.min(b, d) > Math.max(a, c) ? [[Math.max(a, c), Math.min(b, d)]] : []));
      for (const [x, right] of spans) {
        const h = bands[j].bottom - bands[i].top, w = right - x;
        if (w * h > best.w * best.h) best = { x, y: bands[i].top, w, h };
      }
    }
  }
  return best;
}

/** One wall path for a level: collinear touching edges from rooms and outline are painted only once. */
export function planWalls(level: Extract<IndoorLevel, { available: true }>): string {
  const rings = level.outline.split(/Z/i).filter((ring) => ring.trim()).map((ring) => {
    const n = ring.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    return Array.from({ length: n.length / 2 }, (_, i) => [n[i * 2], n[i * 2 + 1]] as Point);
  });
  rings.push(...level.spaces.map((space) => shapePoints(space.shape)));
  const groups = new Map<string, { ux: number; uy: number; offset: number; spans: [number, number][] }>();
  for (const ring of rings) ring.forEach(([x, y], i) => {
    const [xx, yy] = ring[(i + 1) % ring.length], length = Math.hypot(xx - x, yy - y);
    if (length < 1e-7) return;
    const sign = xx < x || (xx === x && yy < y) ? -1 : 1;
    const ux = sign * (xx - x) / length, uy = sign * (yy - y) / length, offset = -uy * x + ux * y;
    const key = [ux, uy, offset].map((n) => n.toFixed(6)).join(",");
    const group = groups.get(key) ?? { ux, uy, offset, spans: [] };
    const a = ux * x + uy * y, b = ux * xx + uy * yy;
    group.spans.push([Math.min(a, b), Math.max(a, b)]);
    groups.set(key, group);
  });
  const paths: string[] = [];
  for (const { ux, uy, offset, spans } of groups.values()) {
    spans.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const [a, b] of spans) {
      const last = merged[merged.length - 1];
      if (last && a <= last[1] + 1e-6) last[1] = Math.max(last[1], b);
      else merged.push([a, b]);
    }
    for (const [a, b] of merged) paths.push(`M${ux * a - uy * offset},${uy * a + ux * offset}L${ux * b - uy * offset},${uy * b + ux * offset}`);
  }
  return paths.join(" ");
}

/** Axis-aligned bounding box of a schematic shape, in plan units. */
export function planShapeBounds(shape: IndoorShape): { x: number; y: number; w: number; h: number } {
  if (shape.kind === "rect") return { x: shape.x, y: shape.y, w: shape.w, h: shape.h };
  if (shape.kind === "circle") return { x: shape.cx - shape.r, y: shape.cy - shape.r, w: shape.r * 2, h: shape.r * 2 };
  const points = shape.points.trim().split(/\s+/).map((point) => point.split(",").map(Number));
  const xs = points.map(([x]) => x), ys = points.map(([, y]) => y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Fill category for a space type: the `cims-room--<category>` class and its legend swatch. */
export type RoomCategory = "classroom" | "study" | "lab" | "office" | "restroom" | "service" | "circulation" | "utility" | "outdoor" | "void";

/** Maps a schematic space type to the fill category drawn on the plan. */
export function roomCategory(type: IndoorSpaceType): RoomCategory {
  if (type === "auditorium") return "classroom";
  if (type === "core") return "restroom";
  return type;
}

/** Legend labels per fill category, in legend order. */
export const roomCategoryLabels: [RoomCategory, string][] = [
  ["classroom", "Classroom"], ["study", "Study"], ["lab", "Lab"], ["office", "Office"],
  ["restroom", "Core and restrooms"], ["service", "Service"], ["utility", "Utility"], ["outdoor", "Outdoor"], ["circulation", "Circulation"],
];

/** Human label per space type (cards, directory). */
export const spaceTypeLabels: Record<IndoorSpaceType, string> = {
  lab: "Lab", study: "Study", office: "Office", auditorium: "Auditorium", core: "Building core", circulation: "Circulation",
  service: "Service", classroom: "Classroom", utility: "Utility", outdoor: "Outdoor", void: "Open to below",
};

/** The space name without a leading copy of its room number ("152 Distance Learning Classroom" → "Distance Learning Classroom"). */
export function spaceDisplayName(space: Pick<IndoorSpace, "name" | "room">): string {
  if (!space.room) return space.name;
  const stripped = space.name.replace(new RegExp(`^${space.room.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`), "");
  return stripped || space.name;
}

/** Bounding box of everything drawn on these levels (outlines and spaces), so every level shares one frame. */
export function drawnBounds(levels: { outline: string; spaces: IndoorSpace[] }[]): { x: number; y: number; w: number; h: number } | undefined {
  const xs: number[] = [], ys: number[] = [];
  for (const level of levels) {
    const numbers = level.outline.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    for (let i = 0; i + 1 < numbers.length; i += 2) { xs.push(numbers[i]); ys.push(numbers[i + 1]); }
    for (const space of level.spaces) { const b = planShapeBounds(space.shape); xs.push(b.x, b.x + b.w); ys.push(b.y, b.y + b.h); }
  }
  if (!xs.length) return undefined;
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Levels sorted bottom to top (basement first). */
export function levelRank(id: string): number {
  return id === "B" ? 0 : Number(id) || 0;
}

/** Whether entrance names and positions support showing north up on this schematic. */
export function planNorthUp(building: IndoorBuilding): boolean {
  const graph = building.graph;
  if (!graph) return false;
  const at = (word: string) => graph.entrances.filter((entrance) => new RegExp(`\\b${word}\\b`, "i").test(entrance.name))
    .map((entrance) => ({ level: entrance.level, node: graph.nodes.find((node) => node.id === entrance.node) }));
  return at("west").some((west) => at("east").some((east) => east.level === west.level && !!west.node && !!east.node && west.node.x < east.node.x));
}
