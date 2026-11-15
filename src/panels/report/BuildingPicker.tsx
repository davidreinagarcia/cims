/** @file Building/place picker for report forms: the map's own search (every building, keyboard friendly) in the sidebar's field style. */
import { useEffect, useState } from "react";
import { loadBuildings, loadedBuildings, type BuildingIndex } from "../../lib/buildings";
import type { CampusSearchResult } from "../../lib/search";
import PlaceField from "../search/PlaceField";
import "../search/search.css";

/** A chosen place: id of the curated place or OSM building, plus its name and map position. */
export interface PickedBuilding { id: string; name: string }

const notRoom = (r: CampusSearchResult) => r.kind !== "room";

/** Search field that finds any campus building or place by name or alias; reports the pick (null when edited). */
export default function BuildingPicker({ label, picked, onPick }: { label: string; picked: PickedBuilding | null; onPick: (b: PickedBuilding | null) => void }) {
  const [buildings, setBuildings] = useState<BuildingIndex | null>(loadedBuildings);
  useEffect(() => { if (!buildings) void loadBuildings().then(setBuildings).catch(() => undefined); }, [buildings]);
  return (
    <PlaceField
      label={label} placeholder="Type a building or place…" buildings={buildings} filter={notRoom}
      picked={picked ? { kind: "building", id: picked.id, group: "Buildings", name: picked.name, meta: "", matches: [] } : null}
      onPick={(r) => onPick(r ? { id: r.id, name: r.name } : null)}
    />
  );
}
