/** @file Category-grouped places inside a footprint, with sourced rooms and current opening status. */
import { useEffect, useState } from "react";
import { loadBuildings, loadedBuildings } from "../../lib/buildings";
import { locationDetails, placeBuilding } from "../../lib/buildingPlaces";
import { places } from "../../lib/places";
import { LAYER_CATALOG } from "../../lib/layerCatalog";
import { openStatus } from "../../lib/hours";
import { useSelection } from "../../state/selection";

/** Show selectable places grouped by category for a footprint or a legacy seed building. */
export default function InsidePlaces({ buildingId, excludeId }: { buildingId: string; excludeId?: string }) {
  const { select } = useSelection();
  const [index, setIndex] = useState(loadedBuildings);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let alive = true;
    void loadBuildings().then(value => { if (alive) setIndex(value); }).catch(() => {});
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);
  const parent = places.features.find(f => f.properties.id === buildingId);
  const resolved = index && parent ? placeBuilding(parent, index, places.features) : buildingId;
  const inside = places.features.filter(f => f.properties.id !== excludeId &&
    (f.properties.building_id === buildingId || (index && placeBuilding(f, index, places.features) === resolved)));
  if (!inside.length) return null;
  const categories = [...new Set(inside.map(f => f.properties.category))].sort();
  return <div className="detail__inside">
    <h3 className="cims-caps">Inside this building</h3>
    {categories.map(category => <div key={category}>
      <h4>{LAYER_CATALOG.find(c => c.id === category)?.label ?? category}</h4>
      <ul>{inside.filter(f => f.properties.category === category).map(item => <li key={item.properties.id}>
        <button type="button" onClick={() => select({ kind: "place", id: item.properties.id })}>
          {item.properties.name}{locationDetails(item).floor_or_room && <> · {locationDetails(item).floor_or_room}</>}
        </button>
        {item.properties.hours && <small className="cims-muted"> · {openStatus(item.properties.hours, now).label}</small>}
      </li>)}</ul>
    </div>)}
  </div>;
}
