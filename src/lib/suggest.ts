/** @file Search-as-you-type suggestions (short ranked list, nothing until typed) and where a result sits on the map. */
import { places } from "./places";
import type { BuildingIndex } from "./buildings";
import { searchCampus, type CampusSearchResult } from "./search";

/** Few, ranked suggestions like a map app: nothing for an empty or one letter query, never the whole campus. */
export function suggest(query: string, buildings: BuildingIndex | null, limit = 6): CampusSearchResult[] {
  if (query.trim().length < 2) return [];
  return searchCampus(query, places.features, buildings?.list ?? []).slice(0, limit);
}

/** The [lng, lat] of a building, room (its building) or place result. */
export function locate(result: Pick<CampusSearchResult, "kind" | "id">, buildings: BuildingIndex | null): [number, number] | undefined {
  if (result.kind === "place") return places.features.find((place) => place.properties.id === result.id)?.geometry.coordinates as [number, number] | undefined;
  const buildingId = result.kind === "room" ? result.id.split(":")[0] : result.id;
  return buildings?.byId.get(buildingId)?.center;
}

const KEY = "cims.recent-searches";
/** Last picked results, newest first, kept only in this browser. */
export function recents(): CampusSearchResult[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as CampusSearchResult[]; } catch { return []; }
}
/** Remembers a picked result (five at most). */
export function remember(result: CampusSearchResult): void {
  try {
    const { kind, id, group, name, meta } = result;
    const next = [{ kind, id, group, name, meta, matches: [] }, ...recents().filter((item) => !(item.kind === kind && item.id === id))].slice(0, 5);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* private mode: recents are a convenience only */ }
}
