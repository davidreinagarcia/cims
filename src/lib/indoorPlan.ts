/** @file Indoor plan helpers shared by the plan, the stack view and the building screen: shape bounds, room categories, labels. */
import type { IndoorBuilding, IndoorShape, IndoorSpace, IndoorSpaceType } from "../indoor/types";

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

/**
 * Whether "up" on this building's plans is north, judged only from the data: true when it names a west and an east
 * entrance on the same level and the west one is drawn left of the east one. Otherwise unknown, so no compass is drawn.
 */
export function planNorthUp(building: IndoorBuilding): boolean {
  const graph = building.graph;
  if (!graph) return false;
  const at = (word: string) => graph.entrances.filter((entrance) => new RegExp(`\\b${word}\\b`, "i").test(entrance.name))
    .map((entrance) => ({ level: entrance.level, node: graph.nodes.find((node) => node.id === entrance.node) }));
  return at("west").some((west) => at("east").some((east) => east.level === west.level && !!west.node && !!east.node && west.node.x < east.node.x));
}
