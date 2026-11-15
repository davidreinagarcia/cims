/** @file Floor plan of one level as an SVG: rooms filled by type, the selected room in gold with the marching outline. */
import type { IndoorBuilding, Room } from "./types";

/** Middle of a room's bounding box, where its number is written. */
function labelPoint(polygon: [number, number][]): [number, number] {
  const xs = polygon.map((p) => p[0]);
  const ys = polygon.map((p) => p[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

/** Draws the rooms of `levelId`. Rooms are buttons: click or Enter picks one. Circulation is drawn but not pickable. */
export default function FloorPlan({
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
  const rooms = building.rooms.filter((r) => r.level === levelId && r.polygon);
  // Circulation first so rooms draw over it; the selected room last so its outline is never covered.
  const order = (r: Room) => (r.id === selectedRoomId ? 2 : r.type === "circulation" ? 0 : 1);
  const sorted = [...rooms].sort((a, b) => order(a) - order(b));
  return (
    <svg className="indoor-plan" viewBox={`0 0 ${building.plan.width} ${building.plan.height}`} role="group" aria-label="Floor plan">
      {sorted.map((room) => {
        const pickable = room.type !== "circulation";
        const selected = room.id === selectedRoomId;
        const [x, y] = labelPoint(room.polygon!);
        return (
          <g
            key={room.id}
            className={pickable ? "indoor-plan__room" : undefined}
            role={pickable ? "button" : undefined}
            tabIndex={pickable ? 0 : undefined}
            aria-label={pickable ? `${room.number} ${room.name}` : undefined}
            aria-pressed={pickable ? selected : undefined}
            onClick={pickable ? () => onPick(room) : undefined}
            onKeyDown={pickable ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onPick(room)) : undefined}
          >
            <polygon
              className={`cims-room cims-room--${room.type}${selected ? " cims-room--selected" : ""}`}
              points={room.polygon!.map((p) => p.join(",")).join(" ")}
            />
            {pickable && (
              <text className="indoor-plan__label" x={x} y={y}>
                {room.number}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
