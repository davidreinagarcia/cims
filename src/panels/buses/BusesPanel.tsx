/** @file Buses panel (T-42): one "Where are you going?" field. Empty, it lists every GT route and the Stingerette; with a destination, only the buses that take you there from where you are. */
import { useEffect, useState } from "react";
import { loadBuildings, loadedBuildings, type BuildingIndex } from "../../lib/buildings";
import type { CampusSearchResult } from "../../lib/search";
import { locate, remember } from "../../lib/suggest";
import PlaceField from "../search/PlaceField";
import BusList from "./BusList";
import BusOptions from "./BusOptions";
import "./buses.css";

/** The panel body shown in the floating card (desktop) or bottom sheet (phone). The start is always your location. */
export default function BusesPanel() {
  const [buildings, setBuildings] = useState<BuildingIndex | null>(loadedBuildings);
  const [to, setTo] = useState<CampusSearchResult | null>(null);
  useEffect(() => {
    let alive = true;
    void loadBuildings().then((index) => { if (alive) setBuildings(index); }).catch(() => { /* places still search */ });
    return () => { alive = false; };
  }, []);
  const destination = to ? locate(to, buildings) : undefined;
  return <section className="buses" aria-label="Buses">
    <div className="buses__dest">
      <PlaceField label="Where are you going?" placeholder="Search a building or place" buildings={buildings} picked={to}
        onPick={(result) => { setTo(result); if (result) remember(result); }} />
      {to && <button type="button" className="cims-btn" onClick={() => setTo(null)}>Clear</button>}
    </div>
    {to && !destination ? <p className="cims-muted">That place has no map position yet.</p>
      : destination ? <BusOptions key={to!.id} origin={null} destination={destination} />
      : <BusList here={null} />}
  </section>;
}
