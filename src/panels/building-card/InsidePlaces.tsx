/** @file Places inside a footprint as a one- or two-column grid of map-pin pictograms with name, floor/room and opening status. */
import { useEffect, useState, type CSSProperties } from "react";
import { loadBuildings, loadedBuildings } from "../../lib/buildings";
import { locationDetails, placeBuilding } from "../../lib/buildingPlaces";
import { places } from "../../lib/places";
import { LAYER_CATALOG } from "../../lib/layerCatalog";
import { openStatus } from "../../lib/hours";
import { useSelection } from "../../state/selection";
import Glyph, { placeGlyph } from "../../components/Glyph";

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
  const order = (category: string) => { const i = LAYER_CATALOG.findIndex(c => c.id === category); return i < 0 ? 99 : i; };
  const sorted = [...inside].sort((a, b) => order(a.properties.category) - order(b.properties.category) || a.properties.name.localeCompare(b.properties.name));
  return <div className="detail__inside">
    <h3 className="cims-caps">Inside this building</h3>
    <ul className="inside-grid">{sorted.map(item => {
      const layer = LAYER_CATALOG.find(c => c.id === item.properties.category);
      const where = locationDetails(item).floor_or_room;
      return <li key={item.properties.id} style={layer ? { "--cat": `var(${layer.cssVar})` } as CSSProperties : undefined}>
        <button type="button" className="inside-grid__item" onClick={() => select({ kind: "place", id: item.properties.id })}>
          <span className="inside-grid__glyph" title={layer?.label ?? item.properties.category}><Glyph id={placeGlyph(item.properties.category, item.properties.subtype)} size={18} /></span>
          <span className="inside-grid__text">
            <span className="inside-grid__name">{item.properties.name}</span>
            {(where || item.properties.hours) && <small className="cims-muted">{[where, item.properties.hours && openStatus(item.properties.hours, now).label].filter(Boolean).join(" · ")}</small>}
          </span>
        </button>
      </li>;
    })}</ul>
  </div>;
}
