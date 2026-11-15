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
