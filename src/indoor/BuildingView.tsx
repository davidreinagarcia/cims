/** @file Expanded building screen over the preserved campus map, with directory and shared building facts. */
import { useEffect, useMemo, useRef, useState } from "react";
import { loadedBuildings, loadBuildings } from "../lib/buildings";
import { BuildingDetails } from "../panels/building-card/BuildingCard";
import { useSelection } from "../state/selection";
import { useAuth } from "../state/auth";
import FloorPlan from "./FloorPlan";
import { findRoute, type IndoorRoute } from "./route";
import { indoorFor } from "./registry";
import type { IndoorBuilding, IndoorSpace, IndoorSpaceType } from "./types";
import "./BuildingView.css";

const typeLabels: Record<IndoorSpaceType, string> = {
  lab: "Lab", study: "Study", office: "Office", auditorium: "Auditorium", core: "Building core", circulation: "Circulation", service: "Service", classroom: "Classroom", utility: "Utility", outdoor: "Outdoor", void: "Open to below",
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
  const [focus, setFocus] = useState<IndoorSpace>();
  const graph = building.graph;
  const destinations = building.levels.flatMap((item) => item.available
    ? item.spaces.filter((space) => space.type !== "void").map((space) => ({ ...space, level: item.id })) : []);
  const [from, setFrom] = useState(graph?.entrances[0] ? `entrance:${graph.entrances[0].id}` : "");
  const [to, setTo] = useState("");
  const [stepFree, setStepFree] = useState(false);
  const [pickStart, setPickStart] = useState(false);
  const [route, setRoute] = useState<IndoorRoute>();
  const [routeMessage, setRouteMessage] = useState("");
  const [query, setQuery] = useState("");
  const [facts, setFacts] = useState(() => loadedBuildings()?.byId.get(building.building_id));
  const back = useRef<HTMLButtonElement>(null);
  const screen = useRef<HTMLElement>(null);
  const directory = useRef<HTMLDivElement>(null);
  const level = building.levels.find((item) => item.id === levelId);
  const spaces = level?.available ? level.spaces : [];
  const filtered = spaces.filter((space) => space.type !== "void" && space.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const groups = [...new Set(filtered.map((space) => space.type))];

  const visibleLegs = useMemo(() => route?.legs.filter((leg) => leg.level === levelId), [route, levelId]);
  const endpoint = (value: string) => {
    if (value.startsWith("entrance:")) {
      const entrance = graph?.entrances.find((item) => `entrance:${item.id}` === value);
      return entrance && { node: entrance.node, name: entrance.name, note: entrance.note };
    }
    const space = destinations.find((item) => item.id === value);
    return space && { node: space.door, name: space.name, note: undefined };
  };
  const clearRoute = () => { setRoute(undefined); setRouteMessage(""); };
  const showRoute = (destination = to) => {
    setPickStart(false);
    setFocus(undefined);
    const start = endpoint(from), end = endpoint(destination);
    if (!graph || !start || !end) {
      setRoute(undefined);
      setRouteMessage("Choose a start and destination");
      return;
    }
    if (!start.node || !end.node) {
      setRoute(undefined);
      setRouteMessage("This space has no walkable entrance in the schematic yet");
      return;
    }
    const result = findRoute(graph, start.node, end.node, { stepFree, fromLabel: start.name, toLabel: end.name });
    setRoute(result ?? undefined);
    setRouteMessage(!result ? "No route found between these two places" : start.node === end.node ? "You are already at your destination. No route needed." : "");
    if (result) { setLevelId(result.legs[0].level); setSelected(undefined); setQuery(""); }
  };
  const chooseSpace = (space: IndoorSpace, directorySelection = false) => {
    setQuery("");
    setSelected({ ...space });
    if (directorySelection) setFocus({ ...space });
    if (graph) {
      clearRoute();
      if (pickStart) { setFrom(space.id); setPickStart(false); }
      else setTo(space.id);
    }
  };
  const routeOptions = <>
    <option value="">Choose a place</option>
    {!!graph?.entrances.length && <optgroup label="Entrances">{graph.entrances.map((item) =>
      <option key={item.id} value={`entrance:${item.id}`}>{item.name}</option>)}</optgroup>}
    {building.levels.map((item) => <optgroup key={item.id} label={item.name}>
      {destinations.filter((space) => space.level === item.id && space.door).map((space) =>
        <option key={space.id} value={space.id}>{space.name}{destinations.filter((other) => other.level === item.id && other.name === space.name).length > 1
          ? ` (option ${destinations.filter((other) => other.level === item.id && other.name === space.name).findIndex((other) => other.id === space.id) + 1})` : ""}</option>)}
    </optgroup>)}
    {selected && !selected.door && <option value={selected.id}>{selected.name}</option>}
  </>;

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
            <FloorPlan key={level.id} level={level} selected={selected} focus={focus} route={route} legs={visibleLegs} onSelect={(space) => chooseSpace(space)} />
            <div className="cims-levels building-view__levels" role="group" aria-label="Building levels">
              {building.levels.map((item) => <button type="button" key={item.id} aria-label={item.name} aria-pressed={item.id === levelId}
                disabled={!item.available} title={item.note ?? item.name} onClick={() => { setLevelId(item.id); setSelected(undefined); setFocus(undefined); setQuery(""); }}>{item.label}</button>)}
            </div>
          </> : <div className="cims-empty building-view__empty"><p>No floor plan for this building yet. We have not found a source we are allowed to use.</p></div>}
        </div>
        <p className="building-view__credit">{building.credit}{building.source_url && <> <a href={building.source_url} target="_blank" rel="noopener noreferrer">Schematic source</a></>}</p>
      </div>
      <aside className="building-view__details" aria-label="Spaces and building details">
        {graph && <section className="building-view__directions" aria-labelledby="directions-title">
          <h3 id="directions-title" className="cims-caps">Directions</h3>
          <form onSubmit={(event) => { event.preventDefault(); showRoute(); }}>
            <label htmlFor="indoor-from">From</label>
            <select id="indoor-from" value={from} onChange={(event) => { setFrom(event.target.value); clearRoute(); }}>{routeOptions}</select>
            {endpoint(from)?.note && <p className="cims-muted">{endpoint(from)?.note}</p>}
            <label htmlFor="indoor-to">To</label>
            <select id="indoor-to" value={to} onChange={(event) => { setTo(event.target.value); clearRoute(); }}>{routeOptions}</select>
            {endpoint(to)?.note && <p className="cims-muted">{endpoint(to)?.note}</p>}
            <div className="building-view__route-actions">
              <button className="cims-btn" type="button" onClick={() => { setFrom(to); setTo(from); clearRoute(); }}>Swap</button>
              <button className="cims-btn" type="button" aria-pressed={pickStart} onClick={() => setPickStart(!pickStart)}>Pick start on the plan</button>
            </div>
            {pickStart && <p role="status">Select a space on the plan to set your start.</p>}
            <label className="building-view__step-free"><input type="checkbox" checked={stepFree} onChange={(event) => { setStepFree(event.target.checked); clearRoute(); }} />Step-free route (elevator only)</label>
            <button className="cims-btn building-view__show-route" type="submit">Show route</button>
          </form>
          <div aria-live="polite" aria-atomic="true">
            {routeMessage && <p>{routeMessage}</p>}
            {route && <p>{route.steps.length} steps · {new Set(route.legs.map((leg) => leg.level)).size} levels · {Math.max(0, route.legs.length - 1)} level crossings</p>}
          </div>
          {route && <>
            <div className="building-view__route-legs" role="group" aria-label="Route levels">
              {route.legs.map((leg, index) => <button className="cims-btn" type="button" key={index} aria-pressed={leg.level === levelId}
                onClick={() => { setLevelId(leg.level); setFocus(undefined); setSelected(undefined); }}>
                {index > 0 ? "Then " : ""}{building.levels.find((item) => item.id === leg.level)?.name ?? leg.level}
              </button>)}
            </div>
            <ol className="building-view__steps">{route.steps.map((step, index) => <li key={index}>
              <button type="button" onClick={() => { setLevelId(step.level); setFocus(undefined); setSelected(undefined); }}>{step.text}</button>
            </li>)}</ol>
          </>}
          <p className="cims-muted">Schematic route, positions approximate, not for emergency use.</p>
        </section>}
        {level?.available && <section className="building-view__directory-section" aria-labelledby="directory-title">
          <h3 id="directory-title" className="cims-caps">Space directory</h3>
          <label className="building-view__search-label" htmlFor="indoor-search">Find a space</label>
          <div className="cims-field"><input id="indoor-search" type="search" value={query} placeholder="Search this level" onChange={(event) => setQuery(event.target.value)} /></div>
          <div ref={directory} className="cims-directory building-view__directory">
            {groups.map((type) => <div key={type}><h4>{typeLabels[type]}</h4>{filtered.filter((space) => space.type === type).map((space) =>
              <button key={space.id} type="button" aria-pressed={selected?.id === space.id} onClick={() => chooseSpace(space, true)}>{space.name}</button>)}</div>)}
            {!filtered.length && <p role="status">No spaces match your search.</p>}
          </div>
          {selected && <section className="building-view__space" aria-label="Selected space" aria-live="polite">
            <h4 className="cims-caps">{selected.name}</h4>
            <span className="cims-tag">{typeLabels[selected.type]}</span>
            {selected.note && <p>{selected.note}</p>}
            <p className="cims-muted">Source: label in the public schematic drawing</p>
            <button className="cims-btn" type="button" disabled={!graph} onClick={() => { setTo(selected.id); showRoute(selected.id); }}>{graph ? "Route here" : "Route here, coming soon"}</button>
          </section>}
        </section>}
        <h3 className="cims-caps building-view__facts-title">Building details</h3>
        <BuildingDetails buildingId={building.building_id} embedded />
      </aside>
    </div>
  </section>;
}
