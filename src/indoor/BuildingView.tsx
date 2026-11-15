/** @file Room first building screen with immediate routing, plan navigation and collapsible building facts. */
import { useEffect, useMemo, useRef, useState } from "react";
import { loadedBuildings, loadBuildings } from "../lib/buildings";
import { BuildingDetails } from "../panels/building-card/BuildingCard";
import { useSelection } from "../state/selection";
import { useAuth } from "../state/auth";
import FloorPlan from "./FloorPlan";
import RoomSearch from "./RoomSearch";
import { findRoute } from "./route";
import { closeIndoor, openIndoor, useOpenIndoor } from "./open";
import { doorLink, indoorFor, resolveRoom } from "./registry";
import type { IndoorBuilding, IndoorSpace, IndoorSpaceType, RoomFact } from "./types";
import "./BuildingView.css";

const typeLabels: Record<IndoorSpaceType, string> = {
  lab: "Lab", study: "Study", office: "Office", auditorium: "Auditorium", core: "Building core", circulation: "Circulation", service: "Service", classroom: "Classroom", utility: "Utility", outdoor: "Outdoor", void: "Open to below",
};

/** Opens registered buildings and resolves room selections straight into a routed building screen. */
export default function BuildingView() {
  const { selection, select } = useSelection();
  const open = useOpenIndoor();
  // A door sticker (QR or NFC) opens the page on this building with the entrance you are standing at.
  useEffect(() => { const link = doorLink(); if (link) { select({ kind: "building", id: link.building.building_id }); openIndoor(link.building.building_id); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const room = selection?.kind === "room" ? resolveRoom(selection.id) : undefined;
  // Picking a building shows its preview card; the full screen opens from the card (or straight from a room or a door sticker).
  const building = selection?.kind === "building" ? (open === selection.id ? indoorFor(selection.id) : undefined) : room?.building;
  // Moving the selection away from a building ends its open screen, so picking it again shows the preview first.
  const previous = useRef(selection);
  useEffect(() => {
    const before = previous.current;
    previous.current = selection;
    if (before?.kind === "building" && (selection?.kind !== "building" || selection.id !== before.id)) closeIndoor();
  }, [selection]);
  return building ? <BuildingScreen key={building.building_id} building={building} initialRoom={room?.routable ? room.space : undefined} initialFact={room && !room.routable ? room.space : undefined} /> : null;
}

function BuildingScreen({ building, initialRoom, initialFact }: { building: IndoorBuilding; initialRoom?: IndoorSpace; initialFact?: RoomFact }) {
  const { selection, select } = useSelection();
  const { dialogOpen } = useAuth();
  // Opened from a building card: leaving returns to that card; opened from a room: leaving returns to the map.
  const leave = () => (selection?.kind === "building" ? closeIndoor() : select(null));
  const graph = building.graph;
  const destinations = useMemo(() => building.levels.flatMap((level) => level.available
    ? level.spaces.filter((space) => space.type !== "void").map((space) => ({ ...space, level: level.id })) : []), [building]);
  const sticker = useMemo(() => { const link = doorLink(); return link?.building.building_id === building.building_id ? link.entranceId : undefined; }, [building]);
  const doorEntrance = graph?.entrances.find((entrance) => entrance.id === sticker) ?? graph?.entrances[0];
  const [levelId, setLevelId] = useState(doorEntrance?.level ?? building.levels.find((level) => level.available)?.id);
  const [selected, setSelected] = useState<IndoorSpace | undefined>(initialRoom);
  const [from, setFrom] = useState(doorEntrance ? `entrance:${doorEntrance.id}` : "");
  const [to, setTo] = useState(initialRoom?.id ?? "");
  const [stepFree, setStepFree] = useState(false);
  const [routeVersion, setRouteVersion] = useState(0);
  const [pickStart, setPickStart] = useState(false);
  const [changeStart, setChangeStart] = useState(false);
  const [facts, setFacts] = useState(() => loadedBuildings()?.byId.get(building.building_id));
  const back = useRef<HTMLButtonElement>(null);
  const startControl = useRef<HTMLButtonElement>(null);
  const screen = useRef<HTMLElement>(null);
  const level = building.levels.find((item) => item.id === levelId);
  const endpoint = (value: string) => {
    const entrance = graph?.entrances.find((item) => `entrance:${item.id}` === value);
    if (entrance) return { node: entrance.node, name: entrance.name, note: entrance.note };
    const space = destinations.find((item) => item.id === value);
    return space && { node: space.door, name: space.name, note: undefined };
  };
  const start = endpoint(from);
  const destination = destinations.find((space) => space.id === to);
  const route = useMemo(() => {
    const entrance = graph?.entrances.find((item) => `entrance:${item.id}` === from);
    const origin = entrance ?? destinations.find((space) => space.id === from);
    const node = origin && ("node" in origin ? origin.node : origin.door);
    const end = destinations.find((space) => space.id === to);
    return graph && node && end?.door ? findRoute(graph, node, end.door, { stepFree, fromLabel: origin?.name, toLabel: end.name }) ?? undefined : undefined;
  }, [graph, destinations, from, to, stepFree, routeVersion]);
  const visibleLegs = useMemo(() => route?.legs.filter((leg) => leg.level === levelId), [route, levelId]);
  const chooseDestination = (space: IndoorSpace) => {
    setPickStart(false); setTo(space.id); setSelected(space); setRouteVersion((version) => version + 1);
  };
  const chooseSpace = (space: IndoorSpace) => {
    if (pickStart) { setFrom(space.id); setPickStart(false); }
    else chooseDestination(space);
  };

  useEffect(() => { setTo(initialRoom?.id ?? ""); setSelected(initialRoom); }, [initialRoom]);
  useEffect(() => {
    if (route) setLevelId(route.legs[0].level);
    else if (destination) setLevelId(destination.level);
  }, [route, destination]);
  useEffect(() => {
    let alive = true;
    void loadBuildings().then((index) => { if (alive) setFacts(index.byId.get(building.building_id)); }).catch(() => { /* Shared details display loading errors. */ });
    return () => { alive = false; };
  }, [building.building_id]);
  useEffect(() => {
    const map = screen.current?.parentElement?.querySelector<HTMLElement>(".map");
    if (map) { map.inert = true; map.setAttribute("aria-hidden", "true"); }
    // From a door sticker the next thing you do is say where you are going.
    if (sticker) screen.current?.querySelector<HTMLInputElement>(".building-view__search input")?.focus();
    else back.current?.focus();
    return () => {
      // Leaving the building ends the sticker session: a later visit starts from the default entrance.
      const url = new URL(location.href);
      if (url.searchParams.has("in") || url.searchParams.has("door")) { url.searchParams.delete("in"); url.searchParams.delete("door"); history.replaceState(null, "", url); }
      if (map) {
        map.inert = false; map.removeAttribute("aria-hidden"); map.tabIndex = -1;
        map.setAttribute("aria-label", "Campus map"); map.focus({ preventScroll: true });
      }
    };
  }, []);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || dialogOpen) return;
      event.preventDefault();
      if (changeStart || pickStart) { setChangeStart(false); setPickStart(false); startControl.current?.focus(); }
      else leave();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [select, dialogOpen, changeStart, pickStart]);

  return <section ref={screen} className="building-view" aria-labelledby="indoor-title">
    <header className="building-view__header">
      <button ref={back} className="cims-btn" type="button" onClick={leave}>Back to map</button>
      <h2 id="indoor-title" className="cims-card__name">{facts?.name ?? building.title}</h2>
      {!!facts?.aliases.length && <span className="cims-card__alias">{facts.aliases.join(", ")}</span>}
      <span className="cims-tag">{building.status === "schematic" ? "Schematic plan" : building.status === "rooms-only" ? "Room finder" : "No floor plan yet"}</span>
    </header>
    <div className="building-view__body">
      {building.status === "rooms-only" ? <RoomDirectory building={building} selected={initialFact} /> : graph ? <>
        <div className="building-view__finder">
          <RoomSearch building={building} onChoose={chooseDestination} />
          <div className="building-view__origin">
            <span>From: {start?.name}</span>
            <button ref={startControl} className="cims-btn" type="button" aria-expanded={changeStart} aria-controls="indoor-start-options"
              onClick={() => setChangeStart(!changeStart)}>Change</button>
          </div>
          {changeStart && <div id="indoor-start-options" className="building-view__start-options">
            <label htmlFor="indoor-from" className="cims-caps">Start point</label>
            <select id="indoor-from" value={from} onChange={(event) => { setFrom(event.target.value); setChangeStart(false); setPickStart(false); startControl.current?.focus(); }}>
              <optgroup label="Entrances">{graph.entrances.map((entrance) => <option key={entrance.id} value={`entrance:${entrance.id}`}>{entrance.name}</option>)}</optgroup>
              {building.levels.map((item) => <optgroup key={item.id} label={item.name}>{destinations.filter((space) => space.level === item.id && space.door).map((space) =>
                <option key={space.id} value={space.id}>{space.name}</option>)}</optgroup>)}
            </select>
            <button className="cims-btn" type="button" onClick={() => { setPickStart(true); setChangeStart(false); }}>Pick on the plan</button>
          </div>}
          {pickStart && <p role="status">Select a space on the plan to set your start.</p>}
        </div>
        {to && <section className="building-view__summary" aria-label="Route summary" aria-live="polite">
          <div className="building-view__route-heading"><strong>{destination?.name}</strong><span>{route ? `${route.steps.length} steps` : "No route found between these two places"}</span>
            <button type="button" className="cims-btn" onClick={() => { setTo(""); setSelected(undefined); setPickStart(false); }}>Clear</button></div>
          <div className="building-view__route-options">
            {route && <div className="building-view__route-levels" role="group" aria-label="Route levels">{[...new Set(route.legs.map((leg) => leg.level))].map((id) =>
              <button className="cims-btn" type="button" key={id} aria-pressed={id === levelId} onClick={() => setLevelId(id)}>{building.levels.find((item) => item.id === id)?.name}</button>)}</div>}
            {route && !stepFree && route.transitions.some((t) => t.kind === "stairs") && <p className="building-view__stairs-note" role="status">
              <strong>Includes stairs</strong> ({(n => `${n} ${n === 1 ? "flight" : "flights"}`)(new Set(route.transitions.filter((t) => t.kind === "stairs").map((t) => t.level + t.to)).size)}).
              <button type="button" className="cims-btn" onClick={() => setStepFree(true)}>Avoid stairs</button></p>}
            <label className="building-view__step-free"><input type="checkbox" role="switch" checked={stepFree} onChange={(event) => setStepFree(event.target.checked)} />Step-free route</label>
          </div>
        </section>}
        <div className="building-view__plan">
          <div className="building-view__drawing">
            <div className="cims-levels building-view__levels" role="group" aria-label="Building levels">{building.levels.map((item) =>
              <button type="button" key={item.id} aria-label={item.name} aria-pressed={item.id === levelId} disabled={!item.available}
                title={item.note ?? item.name} onClick={() => setLevelId(item.id)}>{item.label}</button>)}</div>
            {level?.available && <FloorPlan key={level.id} level={level} selected={selected} route={route} legs={visibleLegs} onSelect={chooseSpace} />}
          </div>
          <p className="building-view__credit">{building.credit}{building.source_url && <> <a href={building.source_url} target="_blank" rel="noopener noreferrer">Schematic source</a></>}</p>
        </div>
      </> : <div className="building-view__no-plan cims-empty"><p>No floor plan for this building yet. Search for a room in Kendeda to see how room finding will work</p></div>}
      <aside className="building-view__details" aria-label="Spaces and building details">
        {route ? <section className="building-view__steps-section" aria-labelledby="steps-title">
          <h3 id="steps-title" className="cims-caps">Directions to {destination?.name}</h3>
          <ol className="building-view__steps">{route.steps.map((step, index) => <li key={index}>
            <button type="button" className={step.vertical ? `building-view__step-vertical building-view__step-vertical--${step.vertical.kind}` : undefined} onClick={() => setLevelId(step.level)}>
              {step.vertical && <span className="building-view__step-badge">{step.vertical.kind === "stairs" ? "Stairs" : "Elevator"} {step.vertical.direction === "up" ? "↑" : "↓"}</span>}{step.text}</button>
          </li>)}</ol>
          {start?.note && <p className="cims-muted">{start.note}</p>}
          <p className="cims-muted">Schematic route, positions approximate, not for emergency use.</p>
        </section> : graph && <section className="building-view__directory-section" aria-labelledby="directory-title">
          <h3 id="directory-title" className="cims-caps">Space directory</h3>
          <div className="cims-directory building-view__directory">{building.levels.map((item) => item.available && <section key={item.id}>
            <h4 className="cims-caps">{item.name}</h4>
            {[...new Set(item.spaces.filter((space) => space.type !== "void").map((space) => space.type))].map((type) => <div key={type}>
              <h5 className="cims-caps">{typeLabels[type]}</h5>
              {item.spaces.filter((space) => space.type === type).map((space) => <button key={space.id} type="button" aria-pressed={selected?.id === space.id}
                onClick={() => chooseDestination(space)}>{space.name}</button>)}
            </div>)}
          </section>)}</div>
        </section>}
        <details className="building-view__facts" open={graph ? undefined : true}>
          <summary className="cims-caps">Building info</summary>
          <BuildingDetails buildingId={building.building_id} embedded />
        </details>
      </aside>
    </div>
  </section>;
}

function RoomDirectory({ building, selected }: { building: IndoorBuilding; selected?: RoomFact }) {
  const { select } = useSelection();
  const choose = (room: RoomFact) => select({ kind: "room", id: `${building.building_id}:${room.id}` });
  const groups = [...building.levels.map((level) => ({ id: level.id, name: level.name })), { id: null, name: "Level not listed" }];
  return <div className="building-view__room-finder">
    <RoomSearch building={building} onChooseRoom={choose} />
    {selected && <section className="building-view__room-card" aria-labelledby="room-title" aria-live="polite">
      <span className="cims-caps">Room card</span>
      <h3 id="room-title">Room {selected.room}</h3>
      <p>{selected.name}</p>
      <dl>
        <div><dt>Level</dt><dd>{selected.level ? `Level ${selected.level}` : "Level not listed"}</dd></div>
        <div><dt>Type</dt><dd>{selected.type}</dd></div>
        <div><dt>Capacity</dt><dd>{selected.capacity != null ? `${selected.capacity} seats` : "Not published"}</dd></div>
      </dl>
      <a className="building-view__room-source" href={selected.source_url} target="_blank" rel="noopener noreferrer">Source</a>
      <p>No floor plan for Clough yet, so no directions inside the building. Walk in through the main entrance and look for the room number.</p>
    </section>}
    <section className="building-view__browse" aria-labelledby="browse-title">
      <h3 id="browse-title" className="cims-caps">Browse by level</h3>
      {groups.map((level) => {
        const rooms = (building.rooms ?? []).filter((room) => room.level === level.id);
        return <details key={level.id ?? "unknown"}>
          <summary>{level.name}<span className="cims-muted">{rooms.length} rooms</span></summary>
          {rooms.map((room) => <button className="building-view__room-result" type="button" key={room.id}
            aria-pressed={selected?.id === room.id} onClick={() => choose(room)}>
            <span>Room {room.room}<small className="cims-muted">{room.name}</small></span>
            {room.capacity != null && <span>{room.capacity} seats</span>}
          </button>)}
        </details>;
      })}
    </section>
    <p className="building-view__credit">{building.credit}</p>
  </div>;
}
