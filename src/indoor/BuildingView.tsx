/** @file Building screen: breadcrumb header, hero plan with level rail and legend, room card with booking, report and numbered directions. */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { loadedBuildings, loadBuildings } from "../lib/buildings";
import { drawnBounds, levelRank, planNorthUp, roomCategory, roomCategoryLabels, spaceDisplayName, spaceTypeLabels } from "../lib/indoorPlan";
import { BuildingDetails } from "../panels/building-card/BuildingCard";
import { useSelection } from "../state/selection";
import { useAuth } from "../state/auth";
import { expandDemoSlots, freeUntil, isRoomFree, nowWindow } from "./availability";
import FloorPlan, { type PlanRoute } from "./FloorPlan";
import { requestBooking, requestBookingsView } from "./handoff";
import RoomSearch from "./RoomSearch";
import { roomAmenitiesById, demoSlotPatterns } from "./roomFinderDemo";
import { findRoute, type IndoorRoute } from "./route";
import StackView, { STACK_VIEW_ENABLED } from "./StackView";
import { closeIndoor, openIndoor, useOpenIndoor } from "./open";
import { doorLink, indoorFor, resolveRoom } from "./registry";
import type { IndoorBuilding, IndoorLevel, IndoorSpace, RoomFact, RoomFeature } from "./types";
import "./BuildingView.css";

type DrawnLevel = Extract<IndoorLevel, { available: true }>;
const PHONE = "(max-width: 767.98px)"; // same breakpoint as the shell's mobile layout
const featureLabels: Record<RoomFeature, string> = { whiteboard: "Whiteboard", display: "Display", outlets: "Outlets", accessible: "Accessible", quiet: "Quiet" };
const clock = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });

function usePhone(): boolean {
  return useSyncExternalStore((onChange) => {
    const query = window.matchMedia(PHONE);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, () => window.matchMedia(PHONE).matches);
}

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

/** Demo availability for a bookable room: free now and until when, from the fictional weekly seed. */
function demoAvailability(roomId: string): { free: boolean; until: Date | null } | undefined {
  if (!roomAmenitiesById.get(roomId)?.bookable) return undefined;
  const now = new Date();
  const slots = [...expandDemoSlots(demoSlotPatterns, now), ...expandDemoSlots(demoSlotPatterns, new Date(now.getTime() + 86_400_000))];
  const free = isRoomFree(roomId, slots, nowWindow(now, 1));
  return { free, until: free ? freeUntil(roomId, slots, now) : null };
}

function BuildingScreen({ building, initialRoom, initialFact }: { building: IndoorBuilding; initialRoom?: IndoorSpace; initialFact?: RoomFact }) {
  const { selection, select } = useSelection();
  const { dialogOpen, requireAuth } = useAuth();
  const phone = usePhone();
  // Opened from a building card: leaving returns to that card; opened from a room: leaving returns to the map.
  const leave = () => (selection?.kind === "building" ? closeIndoor() : select(null));
  const graph = building.graph;
  const destinations = useMemo(() => building.levels.flatMap((level) => level.available
    ? level.spaces.filter((space) => space.type !== "void").map((space) => ({ ...space, level: level.id })) : []), [building]);
  const sticker = useMemo(() => { const link = doorLink(); return link?.building.building_id === building.building_id ? link.entranceId : undefined; }, [building]);
  const doorEntrance = graph?.entrances.find((entrance) => entrance.id === sticker) ?? graph?.entrances[0];
  const [levelId, setLevelId] = useState(initialFact?.level ?? doorEntrance?.level ?? building.levels.find((level) => level.available)?.id);
  const [selected, setSelected] = useState<IndoorSpace | undefined>(initialRoom);
  const [fact, setFact] = useState<RoomFact | undefined>(initialFact);
  const [from, setFrom] = useState(doorEntrance ? `entrance:${doorEntrance.id}` : "");
  const [to, setTo] = useState(initialRoom?.id ?? "");
  const [stepFree, setStepFree] = useState(false);
  const [routeVersion, setRouteVersion] = useState(0);
  const [pickStart, setPickStart] = useState(false);
  const [changeStart, setChangeStart] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  // Stack opens first on every screen; an explicit ?indoor=plan still opens the detailed plan.
  const [view, setView] = useState<"plan" | "stack">(() => STACK_VIEW_ENABLED && building.levels.some((item) => item.available) && new URLSearchParams(location.search).get("indoor") !== "plan" ? "stack" : "plan");
  const [sheet, setSheet] = useState<"peek" | "open">(initialRoom || initialFact ? "open" : "peek");
  const [walking, setWalking] = useState(false); // phone: step-by-step route mode
  const [facts, setFacts] = useState(() => loadedBuildings()?.byId.get(building.building_id));
  const back = useRef<HTMLButtonElement>(null);
  const startControl = useRef<HTMLButtonElement>(null);
  const screen = useRef<HTMLElement>(null);
  const level = building.levels.find((item) => item.id === levelId);
  const drawnLevels = building.levels.filter((item): item is DrawnLevel => item.available);
  const frame = useMemo(() => level?.available ? drawnBounds([level]) : undefined, [level]);
  const levelsTopDown =[...building.levels].sort((a, b) => levelRank(b.id) - levelRank(a.id));
  const endpoint = (value: string) => {
    const entrance = graph?.entrances.find((item) => `entrance:${item.id}` === value);
    if (entrance) return { node: entrance.node, name: entrance.name, note: entrance.note, entrance: true };
    const space = destinations.find((item) => item.id === value);
    return space && { node: space.door, name: space.name, note: undefined, entrance: false };
  };
  const start = endpoint(from);
  const destination = destinations.find((space) => space.id === to);
  const route = useMemo(() => {
    const node = start?.node;
    const end = destinations.find((space) => space.id === to);
    return graph && node && end?.door ? findRoute(graph, node, end.door, { stepFree, fromLabel: start?.name, toLabel: end.name }) ?? undefined : undefined;
  }, [graph, destinations, from, to, stepFree, routeVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const planRoute = (levelFor: string): PlanRoute | undefined => route && {
    route, legs: route.legs.filter((leg) => leg.level === levelFor), activeStep,
    startTag: start?.entrance ? { title: "YOU ENTER HERE", detail: start.name } : { title: "START", detail: start?.name ?? "" },
  };
  const chooseDestination = (space: IndoorSpace) => {
    const targetLevel = destinations.find((item) => item.id === space.id)?.level;
    if (targetLevel) setLevelId(targetLevel);
    setPickStart(false); setTo(space.id); setSelected(space); setFact(undefined); setActiveStep(null); setWalking(false); setSheet("open");
    setRouteVersion((version) => version + 1);
  };
  const chooseSpace = (space: IndoorSpace) => {
    if (pickStart) { setFrom(space.id); setPickStart(false); }
    else chooseDestination(space);
  };
  const clearRoom = () => { setTo(""); setSelected(undefined); setFact(undefined); setPickStart(false); setActiveStep(null); setWalking(false); setSheet("peek"); };
  const goToStep = (index: number) => { if (!route) return; setActiveStep(index); setLevelId(route.steps[index].level); };
  const selectedLevel = selected && building.levels.find((item) => item.available && item.spaces.some((space) => space.id === selected.id));
  const report = (space: IndoorSpace | RoomFact, floor?: string) => requireAuth(() =>
    select({ kind: "report", id: [building.building_id, floor ?? "", space.room ?? spaceDisplayName(space)].join("|") }));

  useEffect(() => { if (initialRoom) { setTo(initialRoom.id); setSelected(initialRoom); } }, [initialRoom]);
  useEffect(() => {
    if (destination) setLevelId(destination.level);
  }, [destination]);
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
      else if (walking) setWalking(false);
      else leave();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [select, dialogOpen, changeStart, pickStart, walking]); // eslint-disable-line react-hooks/exhaustive-deps

  const name = facts?.name ?? building.title;
  const roomCount = (item: IndoorLevel) => item.available ? item.spaces.filter((space) => space.type !== "void").length : 0;

  const startPicker = graph && <div className="building-view__origin">
    <span className="building-view__origin-text"><span className="cims-caps">From</span> {start?.name ?? "Choose a start"}</span>
    <button ref={startControl} className="cims-btn cims-btn--small" type="button" aria-expanded={changeStart} aria-controls="indoor-start-options"
      onClick={() => setChangeStart(!changeStart)}>Change</button>
    {changeStart && <div id="indoor-start-options" className="building-view__start-options">
      <label htmlFor="indoor-from" className="cims-caps">Start point</label>
      <select id="indoor-from" value={from} onChange={(event) => { setFrom(event.target.value); setChangeStart(false); setPickStart(false); setActiveStep(null); startControl.current?.focus(); }}>
        <optgroup label="Entrances">{graph.entrances.map((entrance) => <option key={entrance.id} value={`entrance:${entrance.id}`}>{entrance.name}</option>)}</optgroup>
        {building.levels.map((item) => <optgroup key={item.id} label={item.name}>{destinations.filter((space) => space.level === item.id && space.door).map((space) =>
          <option key={space.id} value={space.id}>{space.name}</option>)}</optgroup>)}
      </select>
      <button className="cims-btn cims-btn--small" type="button" onClick={() => { setPickStart(true); setChangeStart(false); }}>Pick on the plan</button>
    </div>}
    {pickStart && <p className="building-view__hint" role="status">Select a space on the plan to set your start.</p>}
  </div>;

  const roomCard = selected ? <RoomCard building={building} space={selected} levelName={selectedLevel?.name}
    onBook={() => requestBooking(building.building_id, `${building.building_id}:${selected.id}`)}
    onReport={() => report(selected, selectedLevel?.label)} onBookings={requestBookingsView} onClose={clearRoom} /> : fact ? <FactCard fact={fact} onReport={() => report(fact, fact.level ?? undefined)} onBookings={requestBookingsView} onClose={clearRoom} /> : null;

  const directions = route && destination && <section className="building-view__directions" aria-labelledby="steps-title">
    <div className="building-view__directions-head">
      <h4 id="steps-title" className="cims-caps">Directions</h4>
      <span className="cims-mono cims-muted">{route.steps.length} steps</span>
    </div>
    {startPicker}
    {!stepFree && route.transitions.some((t) => t.kind === "stairs") && <p className="building-view__stairs-note" role="status">
      <strong>Includes stairs.</strong>
      <button type="button" className="cims-btn cims-btn--small" onClick={() => setStepFree(true)}>Avoid stairs</button></p>}
    <label className="building-view__step-free"><input type="checkbox" role="switch" checked={stepFree} onChange={(event) => { setStepFree(event.target.checked); setActiveStep(null); }} />Step-free route</label>
    <ol className="building-view__steps">{route.steps.map((step, index) => <li key={index}>
      <button type="button" aria-current={activeStep === index ? "step" : undefined} onClick={() => goToStep(index)}>
        <span className="building-view__step-n" aria-hidden="true">{index + 1}</span>
        <span>{step.vertical && <span className={`building-view__step-badge building-view__step-badge--${step.vertical.kind}`}>{step.vertical.kind === "stairs" ? "Stairs" : "Elevator"} {step.vertical.direction === "up" ? "↑" : "↓"}</span>}{step.text}</span>
      </button>
    </li>)}</ol>
    {start?.note && <p className="building-view__fine">{start.note}</p>}
    <p className="building-view__fine">Schematic route, positions approximate, not for emergency use.</p>
  </section>;
  const noRoute = to && !route && <p className="building-view__hint" role="status">No route found between these two places.</p>;

  const directory = level?.available && <section className="building-view__directory" aria-labelledby="directory-title">
    <h4 id="directory-title" className="cims-caps">{level.name} spaces</h4>
    <ul>{level.spaces.filter((space) => space.type !== "void").map((space) => <li key={space.id}>
      <button type="button" aria-pressed={selected?.id === space.id} onClick={() => chooseDestination(space)}>
        <span className={`building-view__swatch building-view__swatch--${roomCategory(space.type)}`} aria-hidden="true" />
        <span>{spaceDisplayName(space)}</span>{space.room && <span className="cims-mono">{space.room}</span>}
      </button>
    </li>)}</ul>
  </section>;
  const buildingInfo = <details className="building-view__facts" open={graph ? undefined : true}>
    <summary className="cims-caps">Building info</summary>
    <BuildingDetails buildingId={building.building_id} embedded />
  </details>;

  const legend = level?.available && <ul className="building-view__legend" aria-label="Legend">
    {roomCategoryLabels.filter(([category]) => level.spaces.some((space) => space.type !== "void" && roomCategory(space.type) === category)).map(([category, label]) =>
      <li key={category}><span className={`building-view__swatch building-view__swatch--${category}`} aria-hidden="true" />{label}</li>)}
    <li><span className="building-view__swatch building-view__swatch--selected" aria-hidden="true" />Selected</li>
    {route && <li><span className="building-view__swatch building-view__swatch--route" aria-hidden="true" />Route</li>}
  </ul>;
  const furniture = <div className="building-view__furniture">
    <span className="cims-mono">Schematic, not to scale</span>
    {planNorthUp(building) && <span className="building-view__north" role="img" aria-label="North is up (approximate)" title="North is up (approximate, from the entrance names)">
      <svg width="32" height="40" viewBox="0 0 32 40" aria-hidden="true"><text x="16" y="10" textAnchor="middle">N</text><circle cx="16" cy="25" r="13" /><path d="M16 14 L21 32 L16 28 L11 32 Z" /></svg>
    </span>}
  </div>;

  const levelButtons = (order: IndoorLevel[]) => order.map((item) => <button type="button" key={item.id} aria-label={`${item.name}${item.available ? `, ${roomCount(item)} spaces` : ", no plan"}`}
    aria-pressed={item.id === levelId} disabled={!item.available} title={item.note ?? item.name}
    onClick={() => { setLevelId(item.id); setActiveStep(null); }}>{item.label}</button>);

  const plan = view === "stack" && STACK_VIEW_ENABLED && drawnLevels.length > 0
    ? <StackView building={building} levels={drawnLevels} activeId={levelId} selected={selected} route={route} activeStep={activeStep}
      onLevel={(id) => setLevelId(id)} onOpenPlan={() => setView("plan")} onSelect={chooseSpace} roomCount={roomCount} />
    : level?.available ? <FloorPlan key={level.id} level={level} graph={graph} frame={frame} selected={selected} planRoute={planRoute(level.id)} onSelect={chooseSpace} />
      : <div className="building-view__no-plan cims-empty"><p>{level?.note ?? "No floor plan for this level yet."}</p></div>;

  const viewToggle = STACK_VIEW_ENABLED && drawnLevels.length > 1 && <div className="building-view__view-toggle" role="group" aria-label="Plan view">
    <button type="button" aria-pressed={view === "plan"} onClick={() => setView("plan")}>Plan</button>
    <button type="button" aria-pressed={view === "stack"} onClick={() => setView("stack")}>Stack</button>
  </div>;

  return <section ref={screen} className="building-view" data-phone={phone || undefined} aria-labelledby="indoor-title">
    <header className="building-view__header">
      <div className="building-view__heading">
        <div className="building-view__crumbs">
          <button ref={back} className="building-view__back" type="button" onClick={leave} aria-label="Back to map">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 L5 8 L10 13" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
            {!phone && <span>Back to map</span>}
          </button>
          {!phone && <nav className="building-view__breadcrumb cims-caps" aria-label="Breadcrumb"><ol>
            <li><button type="button" onClick={leave}>Campus</button></li>
            <li>{building.slug === "culc" ? "CULC" : building.slug === "kendeda" ? "Kendeda" : name}</li>
            <li aria-current="page">{level?.name ?? "Building"}</li>
          </ol></nav>}
          {phone && <h2 id="indoor-title" className="building-view__title">{name}</h2>}
          {phone && viewToggle}
        </div>
        {!phone && <h2 id="indoor-title" className="building-view__title">{name}</h2>}
        {!phone && !!facts?.aliases.length && <p className="building-view__alias">{facts.aliases.join(", ")}</p>}
      </div>
      <div className="building-view__tools">
        {!phone && viewToggle}
        {(graph || building.rooms?.length) && <RoomSearch building={building} onChoose={chooseDestination}
          onChooseRoom={(room) => { clearRoom(); setFact(room); if (room.level) setLevelId(room.level); setSheet("open"); }} />}
      </div>
    </header>
    {phone && <div className="building-view__level-pills" role="group" aria-label="Building levels">{levelButtons([...building.levels].sort((a, b) => levelRank(a.id) - levelRank(b.id)))}</div>}
    <div className="building-view__body">
      <div className="building-view__frame">
        <div className="building-view__stage">
          {!phone && view === "plan" && <div className="building-view__levels" role="group" aria-label="Building levels">
            <span className="cims-caps">Level</span>{levelButtons(levelsTopDown)}
          </div>}
          {plan}
        </div>
        {!phone && <div className="building-view__frame-foot">{legend}{furniture}</div>}
      </div>
      {!phone && <aside className="building-view__card" aria-label={selected || fact ? "Room" : "Find a room"} aria-live="polite">
        {roomCard ? <>{roomCard}{directions}{noRoute}</> : <>
          <section className="building-view__intro">
            <h3 className="cims-caps">Find a room</h3>
            <p>Pick a space on the plan, or search this building. The route starts at your entrance.</p>
            {startPicker}
          </section>
          {directory}
        </>}
        {buildingInfo}
        <p className="building-view__credit">{building.credit}{building.source_url && <> <a href={building.source_url} target="_blank" rel="noopener noreferrer">Schematic source</a></>}</p>
      </aside>}
    </div>
    {phone && <div className="building-view__sheet" data-state={walking && route ? "walk" : sheet}>
      <button type="button" className="building-view__grip" aria-label={sheet === "open" ? "Collapse details" : "Expand details"} aria-expanded={sheet === "open"}
        onClick={() => setSheet(sheet === "open" ? "peek" : "open")}><span aria-hidden="true" /></button>
      {walking && route ? <StepCard route={route} index={activeStep ?? 0} onStep={goToStep} onExit={() => { setWalking(false); setActiveStep(null); }} />
        : roomCard ? <div className="building-view__sheet-body">
          {roomCard}
          {route && <button type="button" className="cims-btn cims-btn--block building-view__walk" onClick={() => { setWalking(true); goToStep(0); }}>
            Directions · {route.steps.length} steps</button>}
          {noRoute}
        </div>
        : <div className="building-view__sheet-body">
          <div className="building-view__peek">
            <div><strong className="building-view__peek-title">{name}</strong><span className="cims-muted">{level?.name ?? ""} · Indoor map</span></div>
            <button type="button" className="building-view__info" aria-label="Building info and spaces" aria-expanded={sheet === "open"} onClick={() => setSheet(sheet === "open" ? "peek" : "open")}>i</button>
          </div>
          {sheet === "open" && <>{startPicker}{directory}{buildingInfo}<p className="building-view__credit">{building.credit}</p></>}
        </div>}
    </div>}
  </section>;
}

/** Floating room card: name, real room number and capacity only when published, demo features and availability, Book, Report and Go back to bookings. */
function RoomCard({ building, space, levelName, onBook, onReport, onBookings, onClose }: { building: IndoorBuilding; space: IndoorSpace; levelName?: string; onBook: () => void; onReport: () => void; onBookings: () => void; onClose: () => void }) {
  const id = `${building.building_id}:${space.id}`;
  const amenities = roomAmenitiesById.get(id);
  const availability = demoAvailability(id);
  return <section className="building-view__room" aria-labelledby="room-title">
    <div className="building-view__room-head">
      <span className="cims-caps building-view__eyebrow">{[space.room && `Room ${space.room}`, levelName].filter(Boolean).join(" · ")}</span>
      <button type="button" className="building-view__close" aria-label="Close room" onClick={onClose}>×</button>
    </div>
    <h3 id="room-title" className="building-view__room-name">{spaceDisplayName(space)}</h3>
    <dl className="building-view__room-facts">
      <div><dt>Type</dt><dd>{spaceTypeLabels[space.type]}</dd></div>
      <div><dt>Room</dt><dd>{space.room ?? "Unknown"}</dd></div>
      {space.capacity != null && <div><dt>Capacity</dt><dd>{space.capacity} seats</dd></div>}
    </dl>
    {space.note && <p className="building-view__fine">{space.note}</p>}
    {amenities && <div className="building-view__demo">
      <span className="cims-tag cims-tag--alert" title="Features, schedule and booking are fictional prototype data.">Demo data</span>
      {availability && <p className="building-view__avail" data-free={availability.free}>
        <span aria-hidden="true" />{availability.free ? availability.until ? `Free until ${clock.format(availability.until)}` : "Free for the rest of today" : "In use now"}</p>}
      {!!amenities.features?.length && <ul className="building-view__features">{amenities.features.map((feature) => <li key={feature}>{featureLabels[feature]}</li>)}</ul>}
    </div>}
    <div className="building-view__room-actions">
      {amenities?.bookable && <button type="button" className="cims-btn cims-btn--primary cims-btn--block" onClick={onBook}>Book this room</button>}
      <button type="button" className="cims-btn cims-btn--block" onClick={onReport}>Report an issue</button>
      <button type="button" className="cims-btn cims-btn--block" onClick={onBookings}>Go back to bookings</button>
    </div>
  </section>;
}

/** Card for a published room that has no shape on the plan yet. */
function FactCard({ fact, onReport, onBookings, onClose }: { fact: RoomFact; onReport: () => void; onBookings: () => void; onClose: () => void }) {
  return <section className="building-view__room" aria-labelledby="room-title">
    <div className="building-view__room-head">
      <span className="cims-caps building-view__eyebrow">Room {fact.room}{fact.level ? ` · Level ${fact.level}` : ""}</span>
      <button type="button" className="building-view__close" aria-label="Close room" onClick={onClose}>×</button>
    </div>
    <h3 id="room-title" className="building-view__room-name">{fact.name}</h3>
    <dl className="building-view__room-facts">
      <div><dt>Type</dt><dd>{fact.type}</dd></div>
      <div><dt>Capacity</dt><dd>{fact.capacity != null ? `${fact.capacity} seats` : "Unknown"}</dd></div>
    </dl>
    <p className="building-view__fine">Not drawn on the plan yet, so no directions. <a href={fact.source_url} target="_blank" rel="noopener noreferrer">Source</a></p>
    <div className="building-view__room-actions">
      <button type="button" className="cims-btn cims-btn--block" onClick={onReport}>Report an issue</button>
      <button type="button" className="cims-btn cims-btn--block" onClick={onBookings}>Go back to bookings</button>
    </div>
  </section>;
}

/** Phone route mode: one step at a time with Previous and Next; the plan highlights that stretch. */
function StepCard({ route, index, onStep, onExit }: { route: IndoorRoute; index: number; onStep: (index: number) => void; onExit: () => void }) {
  const step = route.steps[index];
  const total = route.steps.length;
  return <section className="building-view__walk-card" aria-label="Walking directions" aria-live="polite">
    <div className="building-view__walk-head">
      <span className="building-view__step-n" aria-hidden="true">{index + 1}</span>
      <div><span className="cims-caps cims-muted">Step {index + 1} of {total}</span><p>{step.text}</p></div>
      <button type="button" className="building-view__close" aria-label="Exit directions" onClick={onExit}>×</button>
    </div>
    <div className="building-view__walk-nav">
      <button type="button" className="cims-btn" disabled={index === 0} onClick={() => onStep(index - 1)}>← Previous</button>
      <span className="building-view__dots" aria-hidden="true">{route.steps.map((_, i) => <i key={i} data-on={i === index || undefined} />)}</span>
      <button type="button" className="cims-btn cims-btn--primary" disabled={index === total - 1} onClick={() => onStep(index + 1)}>Next →</button>
    </div>
  </section>;
}
