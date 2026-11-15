/** @file Expanded building screen over the preserved campus map, with directory and shared building facts. */
import { useEffect, useRef, useState } from "react";
import { loadedBuildings, loadBuildings } from "../lib/buildings";
import { BuildingDetails } from "../panels/building-card/BuildingCard";
import { useSelection } from "../state/selection";
import { useAuth } from "../state/auth";
import FloorPlan from "./FloorPlan";
import { indoorFor } from "./registry";
import type { IndoorBuilding, IndoorSpace, IndoorSpaceType } from "./types";
import "./BuildingView.css";

const typeLabels: Record<IndoorSpaceType, string> = {
  lab: "Lab", study: "Study", office: "Office", auditorium: "Auditorium", core: "Building core", circulation: "Circulation", service: "Service",
};

/** Opens only registered building screens; other selections keep the campus map visible. */
export default function BuildingView() {
  const { selection } = useSelection();
  const building = selection?.kind === "building" ? indoorFor(selection.id) : undefined;
  return building ? <BuildingScreen key={building.building_id} building={building} /> : null;
}

function BuildingScreen({ building }: { building: IndoorBuilding }) {
  const { select } = useSelection();
  const { dialogOpen } = useAuth();
  const [levelId, setLevelId] = useState(building.levels.find((level) => level.available)?.id);
  const [selected, setSelected] = useState<IndoorSpace>();
  const [query, setQuery] = useState("");
  const [facts, setFacts] = useState(() => loadedBuildings()?.byId.get(building.building_id));
  const back = useRef<HTMLButtonElement>(null);
  const screen = useRef<HTMLElement>(null);
  const directory = useRef<HTMLDivElement>(null);
  const level = building.levels.find((item) => item.id === levelId);
  const spaces = level?.available ? level.spaces : [];
  const filtered = spaces.filter((space) => space.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const groups = [...new Set(filtered.map((space) => space.type))];

  useEffect(() => {
    let alive = true;
    void loadBuildings().then((index) => { if (alive) setFacts(index.byId.get(building.building_id)); }).catch(() => { /* Shared details show the load error. */ });
    return () => { alive = false; };
  }, [building.building_id]);

  useEffect(() => {
    const map = screen.current?.parentElement?.querySelector<HTMLElement>(".map");
    if (map) { map.inert = true; map.setAttribute("aria-hidden", "true"); }
    back.current?.focus();
    return () => {
      if (map) {
        map.inert = false;
        map.removeAttribute("aria-hidden");
        map.tabIndex = -1;
        map.setAttribute("aria-label", "Campus map");
        map.focus({ preventScroll: true });
      }
    };
  }, []);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented && !dialogOpen) { event.preventDefault(); select(null); }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [select, dialogOpen]);

  useEffect(() => {
    const item = directory.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    // Only scroll the directory itself, preserving the phone page's reading position.
    if (item && directory.current) directory.current.scrollTop = Math.max(0, item.offsetTop - directory.current.offsetTop - 70);
  }, [selected]);

  return <section ref={screen} className="building-view" aria-labelledby="indoor-title">
    <header className="building-view__header">
      <button ref={back} className="cims-btn" type="button" onClick={() => select(null)}>Back to map</button>
      <div className="building-view__heading">
        <h2 id="indoor-title" className="cims-card__name">{facts?.name ?? building.title}</h2>
        <p className="cims-card__alias">{facts?.aliases.length ? facts.aliases.join(", ") : "Unknown"}</p>
        <div className="building-view__tags"><span className="cims-tag">Building</span><span className="cims-tag">{building.status === "schematic" ? "Schematic plan" : "No floor plan yet"}</span></div>
      </div>
    </header>
    <div className="building-view__body">
      <div className="building-view__plan">
        <nav className="cims-breadcrumb" aria-label="Building location"><span>{facts?.name ?? building.title}</span>{level && <span>{level.name}</span>}</nav>
        <div className="building-view__drawing">
          {level?.available ? <>
            <FloorPlan key={level.id} level={level} selected={selected} onSelect={(space) => { setQuery(""); setSelected({ ...space }); }} />
            <div className="cims-levels building-view__levels" role="group" aria-label="Building levels">
              {building.levels.map((item) => <button type="button" key={item.id} aria-label={item.name} aria-pressed={item.id === levelId}
                disabled={!item.available} title={item.note ?? item.name} onClick={() => { setLevelId(item.id); setSelected(undefined); setQuery(""); }}>{item.label}</button>)}
            </div>
          </> : <div className="cims-empty building-view__empty"><p>No floor plan for this building yet. We have not found a source we are allowed to use.</p></div>}
        </div>
        <p className="building-view__credit">{building.credit}{building.source_url && <> <a href={building.source_url} target="_blank" rel="noopener noreferrer">Schematic source</a></>}</p>
      </div>
      <aside className="building-view__details" aria-label="Spaces and building details">
        {level?.available && <section className="building-view__directory-section" aria-labelledby="directory-title">
          <h3 id="directory-title" className="cims-caps">Space directory</h3>
          <label className="building-view__search-label" htmlFor="indoor-search">Find a space</label>
          <div className="cims-field"><input id="indoor-search" type="search" value={query} placeholder="Search this level" onChange={(event) => setQuery(event.target.value)} /></div>
          <div ref={directory} className="cims-directory building-view__directory">
            {groups.map((type) => <div key={type}><h4>{typeLabels[type]}</h4>{filtered.filter((space) => space.type === type).map((space) =>
              <button key={space.id} type="button" aria-pressed={selected?.id === space.id} onClick={() => setSelected({ ...space })}>{space.name}</button>)}</div>)}
            {!filtered.length && <p role="status">No spaces match your search.</p>}
          </div>
          {selected && <section className="building-view__space" aria-label="Selected space" aria-live="polite">
            <h4 className="cims-caps">{selected.name}</h4>
            <span className="cims-tag">{typeLabels[selected.type]}</span>
            {selected.note && <p>{selected.note}</p>}
            <p className="cims-muted">Source: label in the public schematic drawing</p>
            <button className="cims-btn" type="button" disabled>Route here, coming soon</button>
          </section>}
        </section>}
        <h3 className="cims-caps building-view__facts-title">Building details</h3>
        <BuildingDetails buildingId={building.building_id} embedded />
      </aside>
    </div>
  </section>;
}
