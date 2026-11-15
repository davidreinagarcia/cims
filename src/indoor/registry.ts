/** @file Registry of buildings with an indoor screen, including explicit no-plan placeholders. */
import kendeda from "../data/indoor/kendeda.json";
import culc from "../data/indoor/culc.json";
import type { IndoorBuilding, IndoorLevel, IndoorSpace, RoomFact } from "./types";

const buildings = [kendeda, culc] as unknown as IndoorBuilding[];

/** Returns the curated indoor model for this footprint id, if supported. */
export function indoorFor(buildingId: string): IndoorBuilding | undefined {
  return buildings.find((building) => building.building_id === buildingId);
}

/** Whether a building opens the indoor screen instead of the sidebar card. */
export function hasIndoor(id: string): boolean {
  return indoorFor(id) !== undefined;
}

/** A searchable indoor entry explicitly distinguishes drawn routes from published facts. */
export type IndoorRoom = { id: string; building: IndoorBuilding; level: IndoorLevel | undefined } & (
  | { routable: true; space: IndoorSpace }
  | { routable: false; space: RoomFact }
);

/** Lists routable schematic spaces and rooms without geometry for search and selection. */
export function indoorRooms(): IndoorRoom[] {
  return buildings.flatMap((building): IndoorRoom[] => [
    ...building.levels.flatMap((level) => level.available
      ? level.spaces.filter((space) => space.type !== "void" && space.door && building.graph?.nodes.some((node) => node.id === space.door))
        .map((space) => ({ id: `${building.building_id}:${space.id}`, building, level, space, routable: true as const })) : []),
    ...(building.rooms ?? []).map((space) => ({ id: `${building.building_id}:${space.id}`, building,
      level: building.levels.find((level) => level.id === space.level), space, routable: false as const })),
  ]);
}

/** Resolves a room selection id without guessing a building or room. */
export function resolveRoom(id: string) {
  return indoorRooms().find((room) => room.id === id);
}
