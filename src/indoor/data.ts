/** @file Access to indoor data: which buildings have a floor plan, plus helpers to read levels and rooms. */
import demoHall from "../data/mocks/indoor-demo.json";
import type { IndoorBuilding, Level, Room } from "./types";

const files = import.meta.glob<{ default: unknown }>("../data/indoor/*/building.json", { eager: true });
const real = Object.values(files).map((m) => m.default as IndoorBuilding);

/** True when the page was opened with ?indoor=…: the fictional Demo Hall becomes available. */
const demoRequested = typeof location !== "undefined" && new URLSearchParams(location.search).has("indoor");

/** Every building with a floor plan. The fictional fixture is included only when asked for by URL. */
export const indoorBuildings: IndoorBuilding[] = demoRequested ? [...real, demoHall as unknown as IndoorBuilding] : real;

/** The indoor data of a building, or undefined when it has none ("Indoor map coming soon"). */
export function getIndoor(buildingId: string): IndoorBuilding | undefined {
  return indoorBuildings.find((b) => b.building_id === buildingId);
}

/** Levels from the top floor down, the order a level selector lists them. */
export function levelsTopDown(building: IndoorBuilding): Level[] {
  return [...building.levels].sort((a, b) => b.order - a.order);
}

/** The level people walk in on (or the lowest one when none is marked). */
export function entranceLevel(building: IndoorBuilding): Level {
  return building.levels.find((l) => l.entrance) ?? [...building.levels].sort((a, b) => a.order - b.order)[0];
}

/** Splits a room selection id ("<building_id>/<room id>") and finds its building and room. */
export function findRoom(selectionId: string): { building: IndoorBuilding; room: Room } | undefined {
  const cut = selectionId.lastIndexOf("/");
  const building = getIndoor(selectionId.slice(0, cut));
  const room = building?.rooms.find((r) => r.id === selectionId.slice(cut + 1));
  return building && room ? { building, room } : undefined;
}
