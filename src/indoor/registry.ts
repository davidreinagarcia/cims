/** @file Registry of buildings with an indoor screen, including explicit no-plan placeholders. */
import kendeda from "../data/indoor/kendeda.json";
import culc from "../data/indoor/culc.json";
import type { IndoorBuilding } from "./types";

const buildings = [kendeda, culc] as IndoorBuilding[];

/** Returns the curated indoor model for this footprint id, if supported. */
export function indoorFor(buildingId: string): IndoorBuilding | undefined {
  return buildings.find((building) => building.building_id === buildingId);
}

/** Whether a building opens the indoor screen instead of the sidebar card. */
export function hasIndoor(id: string): boolean {
  return indoorFor(id) !== undefined;
}

/** Lists routable spaces with their building, level and globally unique selection id. */
export function indoorRooms() {
  return buildings.flatMap((building) => building.levels.flatMap((level) => level.available
    ? level.spaces.filter((space) => space.type !== "void" && space.door && building.graph?.nodes.some((node) => node.id === space.door))
      .map((space) => ({ id: `${building.building_id}:${space.id}`, building, level, space })) : []));
}

/** Resolves a room selection id without guessing a building or room. */
export function resolveRoom(id: string) {
  return indoorRooms().find((room) => room.id === id);
}
