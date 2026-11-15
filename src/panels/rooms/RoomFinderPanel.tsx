/** @file Room finder (F-11/T-24): filter Kendeda rooms by time, capacity and features; results open on the floor plan. */
import { useEffect, useMemo, useState } from "react";
import { campusTimeToday, expandDemoSlots, findFreeRooms, nowWindow, type FreeRoom, type TimeWindow } from "../../indoor/availability";
import { indoorRooms } from "../../indoor/registry";
import { demoSlotPatterns, roomAmenitiesById } from "../../indoor/roomFinderDemo";
import type { RoomFeature } from "../../indoor/types";
import { useSelection } from "../../state/selection";
import "./rooms.css";

const FEATURES: { id: RoomFeature; label: string }[] = [
  { id: "whiteboard", label: "Whiteboard" },
  { id: "display", label: "Screen / display" },
  { id: "outlets", label: "Outlets" },
  { id: "accessible", label: "Accessible" },
  { id: "quiet", label: "Quiet" },
];
const DURATIONS = [30, 60, 90, 120];

function toggled<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value); else next.add(value);
  return next;
}

/**
 * Sidebar tab: searches the Kendeda room finder demo seed for bookable rooms free over a time
 * window, filtered by capacity and features. Picking a result selects it (Selection kind "room"),
 * which reuses the existing indoor search/routing path to open the building screen with that room
 * highlighted on the floor plan (see `BuildingView.tsx`) -- no separate highlight mechanism needed.
 */
export default function RoomFinderPanel() {
  const { select } = useSelection();
  const [now, setNow] = useState(() => new Date());
  const [mode, setMode] = useState<"now" | "at">("now");
  const [atTime, setAtTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [minCapacity, setMinCapacity] = useState("");
  const [features, setFeatures] = useState<Set<RoomFeature>>(new Set());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const window_: TimeWindow | null = useMemo(() => {
    if (mode === "now") return nowWindow(now, duration);
    const start = campusTimeToday(now, atTime);
    return start ? { start, end: new Date(start.getTime() + duration * 60_000) } : null;
  }, [mode, now, atTime, duration]);

  const rooms = useMemo(() => indoorRooms(), []);
  const slots = useMemo(() => {
    if (!window_) return [];
    const nextDay = new Date(window_.start.getTime() + 24 * 60 * 60 * 1000);
    return [...expandDemoSlots(demoSlotPatterns, window_.start), ...expandDemoSlots(demoSlotPatterns, nextDay)];
  }, [window_]);

  const results: FreeRoom[] = useMemo(() => {
    if (!window_) return [];
    return findFreeRooms(rooms, roomAmenitiesById, slots, {
      window: window_,
      minCapacity: minCapacity === "" ? undefined : Number(minCapacity),
      features: [...features],
    });
  }, [rooms, slots, window_, minCapacity, features]);

  return (
    <section className="room-finder" aria-label="Room finder">
      <h2 className="cims-caps">
        Room finder <span className="cims-tag cims-tag--alert" title="Seeded capacity, features, schedule and booking links -- not a real GT feed.">DEMO</span>
      </h2>
      <p className="cims-muted room-finder__intro">
        Free, bookable rooms in Kendeda right now or at a time you pick. Capacity, features and the
        weekly schedule below are seeded demo data (PRD F-11): there is no real GT availability feed yet.
      </p>

      <fieldset className="room-finder__when">
        <legend className="cims-caps">When</legend>
        <div className="cims-chips" role="radiogroup" aria-label="When">
          <button type="button" className="cims-chip" aria-pressed={mode === "now"} onClick={() => setMode("now")}>Available now</button>
          <button type="button" className="cims-chip" aria-pressed={mode === "at"} onClick={() => setMode("at")}>At a time</button>
        </div>
        {mode === "at" && (
          <div className="cims-field room-finder__time">
            <input type="time" aria-label="Time today" value={atTime} onChange={(event) => setAtTime(event.target.value)} />
          </div>
        )}
        <label className="room-finder__duration">
          For
          <select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
            {DURATIONS.map((value) => <option key={value} value={value}>{value} min</option>)}
          </select>
        </label>
        {mode === "at" && !window_ && <p className="cims-muted" role="status">Pick a time to search.</p>}
      </fieldset>

      <fieldset className="room-finder__filters">
        <legend className="cims-caps">Capacity &amp; features</legend>
        <label className="cims-field room-finder__capacity">
          <span className="cims-muted">At least</span>
          <input type="number" min={0} inputMode="numeric" placeholder="Any" value={minCapacity}
            onChange={(event) => setMinCapacity(event.target.value)} aria-label="Minimum capacity" />
          <span className="cims-muted">people</span>
        </label>
        <div className="cims-chips" role="group" aria-label="Features">
          {FEATURES.map((feature) => (
            <button key={feature.id} type="button" className="cims-chip" aria-pressed={features.has(feature.id)}
              onClick={() => setFeatures(toggled(features, feature.id))}>{feature.label}</button>
          ))}
        </div>
      </fieldset>

      <ul className="room-finder__results cims-results" aria-label="Free rooms" aria-live="polite">
        {results.map((room) => (
          <li key={room.id}>
            <button type="button" className="room-finder__result" onClick={() => select({ kind: "room", id: room.id })}>
              <span className="room-finder__result-head">
                {/* The schematic has no room numbers yet (T-20); the space id disambiguates same-named rooms, e.g. two "Classroom"s. */}
                <strong>{room.space.name} <span className="cims-mono cims-muted">({room.space.id})</span></strong>
                <span className="cims-tag">{room.building.title.replace(/^The /, "")} &middot; {room.level.name}</span>
              </span>
              <span className="room-finder__result-meta cims-mono cims-muted">
                {room.amenities.capacity !== undefined && <>Up to {room.amenities.capacity} &middot; </>}
                {(room.amenities.features ?? []).join(", ") || "No listed features"}
              </span>
              {room.amenities.owner_system && (
                <span className="room-finder__result-policy cims-muted">
                  {room.amenities.owner_system}{room.amenities.policy ? ` -- ${room.amenities.policy}` : ""}
                </span>
              )}
            </button>
            {room.amenities.book_url && (
              <a className="cims-btn room-finder__book" href={room.amenities.book_url} target="_blank" rel="noopener noreferrer"
                title="Prototype link: opens a placeholder page, not a real booking system.">
                Book <span className="cims-tag cims-tag--alert">Prototype</span>
              </a>
            )}
          </li>
        ))}
      </ul>
      {window_ && results.length === 0 && (
        <div className="cims-empty" role="status">
          <strong>No free rooms match</strong>
          <span>Try a shorter duration or fewer filters.</span>
        </div>
      )}
    </section>
  );
}
