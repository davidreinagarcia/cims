/** @file Room directory of one level: rooms grouped by type with a filter box; the selected room is marked. */
import { useMemo, useState } from "react";
import type { IndoorBuilding, Room, RoomType } from "./types";

const GROUPS: { type: RoomType; label: string }[] = [
  { type: "classroom", label: "Classrooms" },
  { type: "study", label: "Study rooms" },
  { type: "lab", label: "Labs" },
  { type: "office", label: "Offices" },
  { type: "restroom", label: "Restrooms" },
  { type: "other", label: "Other" },
];

/** Lists the rooms of `levelId` by type. Typing filters by number or name. */
export default function Directory({
  building,
  levelId,
  selectedRoomId,
  onPick,
}: {
  building: IndoorBuilding;
  levelId: string;
  selectedRoomId: string | null;
  onPick: (room: Room) => void;
}) {
  const [query, setQuery] = useState("");
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rooms = building.rooms
      .filter((r) => r.level === levelId && r.type !== "circulation")
      .filter((r) => !q || `${r.number} ${r.name}`.toLowerCase().includes(q))
      .sort((a, b) => a.number.localeCompare(b.number, "en", { numeric: true }));
    return GROUPS.map((g) => ({ ...g, rooms: rooms.filter((r) => r.type === g.type) })).filter((g) => g.rooms.length);
  }, [building, levelId, query]);

  return (
    <nav className="cims-directory indoor-directory" aria-label="Rooms on this level">
      <input
        className="indoor-directory__filter"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter rooms…"
        aria-label="Filter rooms on this level"
      />
      {groups.length === 0 && <p className="indoor-directory__empty">No rooms match on this level.</p>}
      {groups.map((g) => (
        <section key={g.type}>
          <h4>{g.label}</h4>
          {g.rooms.map((room) => (
            <a
              key={room.id}
              href={`#room-${room.id}`}
              aria-current={room.id === selectedRoomId ? "true" : undefined}
              onClick={(e) => {
                e.preventDefault();
                onPick(room);
              }}
            >
              <span className="indoor-directory__swatch cims-room-swatch" data-type={room.type} aria-hidden="true" />
              <span className="indoor-directory__number">{room.number}</span>
              <span>{room.name}</span>
              {room.capacity != null && <span className="indoor-directory__cap">{room.capacity} seats</span>}
            </a>
          ))}
        </section>
      ))}
    </nav>
  );
}
