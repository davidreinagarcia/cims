/** @file Short card for a building with an indoor map: name, thumbnail of the entrance floor, key facts and the button that opens the full indoor screen. */
import { useEffect, useState } from "react";
import { loadBuildings, loadedBuildings } from "../../lib/buildings";
import { openIndoor, useOpenIndoor } from "../../indoor/open";
import { indoorFor } from "../../indoor/registry";
import { useSelection } from "../../state/selection";
import "./building-card.css";

/** Preview for the selected building when it has an indoor map; nothing otherwise or while the full screen is open. */
export default function BuildingPreview() {
  const { selection, select } = useSelection();
  const open = useOpenIndoor();
  const building = selection?.kind === "building" ? indoorFor(selection.id) : undefined;
  const [facts, setFacts] = useState(() => building && loadedBuildings()?.byId.get(building.building_id));
  useEffect(() => {
    if (!building) return;
    let alive = true;
    void loadBuildings().then((index) => { if (alive) setFacts(index.byId.get(building.building_id)); }).catch(() => { /* the card works without OSM facts */ });
    return () => { alive = false; };
  }, [building]);
  if (!building || open === building.building_id) return null;

  const drawn = building.levels.filter((level) => level.available);
  const first = drawn[0];
  const rooms = building.status === "rooms-only" ? building.rooms?.length ?? 0
    : drawn.reduce((sum, level) => sum + (level.available ? level.spaces.filter((space) => space.type !== "void" && space.door).length : 0), 0);
  const [lng, lat] = facts?.center ?? [];
  const directions = facts ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : undefined;
  const aliases = facts?.aliases ?? [];
  return (
    <section className="detail preview" aria-label="Building preview">
      <h2 className="cims-card__name">{facts?.name ?? building.title}</h2>
      {!!aliases.length && <p className="cims-card__alias">{aliases.join(", ")}</p>}
      {first?.available && (
        <svg className="preview__plan" viewBox={first.viewBox.join(" ")} role="img" aria-label={`Thumbnail of ${first.name}`} preserveAspectRatio="xMidYMid meet">
          <path d={first.outline} className="preview__outline" />
          {first.spaces.filter((space) => space.type !== "void").map((space) => space.shape.kind === "rect"
            ? <rect key={space.id} x={space.shape.x} y={space.shape.y} width={space.shape.w} height={space.shape.h} className="preview__space" />
            : space.shape.kind === "polygon" ? <polygon key={space.id} points={space.shape.points} className="preview__space" /> : null)}
        </svg>
      )}
      <p className="detail__tags">
        <span className="cims-tag">{drawn.length} {drawn.length === 1 ? "level" : "levels"}</span>
        {rooms > 0 && <span className="cims-tag">{rooms} rooms</span>}
        <span className="cims-tag">Schematic plan</span>
      </p>
      <div className="cims-actions">
        <button type="button" className="cims-btn cims-btn--primary" onClick={() => openIndoor(building.building_id)}>Open building map</button>
        {directions ? <a className="cims-btn" href={directions} target="_blank" rel="noopener noreferrer">Directions</a>
          : <button type="button" className="cims-btn" onClick={() => select(null)}>Close</button>}
      </div>
    </section>
  );
}
