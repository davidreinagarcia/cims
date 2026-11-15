/** @file Room finder (F-11): lists the bookable rooms of a building that are free for a time window, filtered by capacity and features. */
import { useEffect, useMemo, useState } from "react";
import demoPattern from "../../data/mocks/availability-demo.json";
import { expandDemoSlots, findFreeRooms, freeUntil, nowWindow, type DemoSlotPattern } from "../../indoor/availability";
import { roomSelectionId, type IndoorBuilding, type Room, type RoomFeature } from "../../indoor/types";
import "./rooms.css";

const WINDOWS = [
  { minutes: 30, label: "Available now (30 min)" },
  { minutes: 60, label: "Next hour" },
  { minutes: 120, label: "Next 2 hours" },
];
const CAPACITIES = [0, 2, 4, 6, 8];
const FEATURES: { id: RoomFeature; label: string }[] = [
  { id: "whiteboard", label: "Whiteboard" },
  { id: "display", label: "Screen" },
  { id: "outlets", label: "Outlets" },
  { id: "accessible", label: "Accessible" },
  { id: "quiet", label: "Quiet" },
];
const clock = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });

/**
 * The finder for one building. Reports the free room ids through `onFreeChange` so the floor plan can mark
 * them. Availability exists only as fictional demo data, so real buildings get an honest empty state.
 */
export default function RoomFinder({
  building,
  selectedRoomId,
  onPick,
  onFreeChange,
}: {
  building: IndoorBuilding;
  selectedRoomId: string | null;
  onPick: (room: Room) => void;
  onFreeChange: (freeRoomIds: Set<string>) => void;
}) {
  const [minutes, setMinutes] = useState(30);
  const [minCapacity, setMinCapacity] = useState(0);
  const [features, setFeatures] = useState<RoomFeature[]>([]);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const slots = useMemo(() => (building.demo ? expandDemoSlots(demoPattern.slots as DemoSlotPattern[], now) : []), [building, now]);
  const free = useMemo(
    () => (building.demo ? findFreeRooms([building], slots, { window: nowWindow(now, minutes), minCapacity: minCapacity || undefined, features }) : []),
    [building, slots, now, minutes, minCapacity, features],
  );
  useEffect(() => {
    onFreeChange(new Set(free.map((f) => f.room.id)));
    return () => onFreeChange(new Set());
  }, [free, onFreeChange]);

  if (!building.demo) {
    return <p className="rooms__empty">No availability data for this building yet. CIMS only shows availability it can source.</p>;
  }
  const toggle = (id: RoomFeature) => setFeatures((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  return (
    <div className="rooms">
      <p className="rooms__demo">
        <span className="cims-tag cims-tag--alert">Demo data</span> Invented bookings, not a GT system.
      </p>
      <div className="rooms__filters">
        <label>
          <span>When</span>
          <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            {WINDOWS.map((w) => (
              <option key={w.minutes} value={w.minutes}>
                {w.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Seats</span>
          <select value={minCapacity} onChange={(e) => setMinCapacity(Number(e.target.value))}>
            {CAPACITIES.map((c) => (
              <option key={c} value={c}>
                {c ? `${c} or more` : "Any"}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>Must have</legend>
          {FEATURES.map((f) => (
            <label key={f.id} className="rooms__feature">
              <input type="checkbox" className="cims-check" checked={features.includes(f.id)} onChange={() => toggle(f.id)} />
              {f.label}
            </label>
          ))}
        </fieldset>
      </div>

      <h4 aria-live="polite">
        {free.length} free {free.length === 1 ? "room" : "rooms"} · {clock.format(now)}
      </h4>
      {free.length === 0 && <p className="rooms__empty">No bookable room matches. Try a shorter window or fewer requirements.</p>}
      {free.map(({ room }) => {
        const until = freeUntil(roomSelectionId(building.building_id, room.id), slots, now);
        const level = building.levels.find((l) => l.id === room.level);
        return (
          <a
            key={room.id}
            href={`#room-${room.id}`}
            aria-current={room.id === selectedRoomId ? "true" : undefined}
            onClick={(e) => {
              e.preventDefault();
              onPick(room);
            }}
          >
            <span className="rooms__number">{room.number}</span>
            <span>
              {room.name}
              <small>
                {level?.label} · {room.capacity} seats · {until ? `free until ${clock.format(until)}` : "free for the rest of today"}
              </small>
            </span>
          </a>
        );
      })}
    </div>
  );
}
