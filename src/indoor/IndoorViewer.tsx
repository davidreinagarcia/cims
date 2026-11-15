/** @file Indoor viewer (F-06): covers the map with a building's floor plan, level selector and room directory. */
import { useEffect } from "react";
import { useSelection } from "../state/selection";
import { findRoom, getIndoor, levelsTopDown } from "./data";
import Directory from "./Directory";
import FloorPlan from "./FloorPlan";
import { useIndoor } from "./state";
import { roomSelectionId, type Room } from "./types";
import "./indoor.css";

/** Renders nothing on the campus map; once a building is entered (or a room is selected) shows its floor plan. */
export default function IndoorViewer() {
  const { buildingId, levelId, enter, exit, setLevel } = useIndoor();
  const { selection, select } = useSelection();
  const picked = selection?.kind === "room" ? findRoom(selection.id) : undefined;

  // A room selected anywhere (directory, search, a link) opens its building on the right level.
  const pickedBuilding = picked?.building.building_id;
  const pickedLevel = picked?.room.level;
  useEffect(() => {
    if (pickedBuilding && pickedLevel) enter(pickedBuilding, pickedLevel);
  }, [pickedBuilding, pickedLevel, enter]);

  const building = buildingId ? getIndoor(buildingId) : undefined;
  const level = building?.levels.find((l) => l.id === levelId);
  if (!building || !level) return null;

  const selectedRoomId = picked?.building === building ? picked.room.id : null;
  const pick = (room: Room) => select({ kind: "room", id: roomSelectionId(building.building_id, room.id) });
  const leave = () => {
    if (selection?.kind === "room") select(null);
    exit();
  };
  const selectedRoom = selectedRoomId ? picked!.room : null;

  return (
    <section className="indoor" aria-label={`Indoor map of ${building.name}`}>
      <header className="indoor__bar">
        <nav className="cims-breadcrumb" aria-label="Where you are">
          <a
            href="#campus"
            onClick={(e) => {
              e.preventDefault();
              leave();
            }}
          >
            Campus
          </a>
          <span>{building.name}</span>
          <span aria-current="page">{level.label}</span>
        </nav>
        {building.demo && <span className="cims-tag cims-tag--alert">Demo layout: not a real building</span>}
      </header>

      <div className="indoor__stage">
        <FloorPlan building={building} levelId={level.id} selectedRoomId={selectedRoomId} onPick={pick} />
        <div className="cims-levels indoor__levels" role="group" aria-label="Level">
          {levelsTopDown(building).map((l) => (
            <button key={l.id} type="button" aria-pressed={l.id === level.id} aria-label={l.label} onClick={() => setLevel(l.id)}>
              {l.short}
            </button>
          ))}
        </div>
        {selectedRoom && selectedRoom.level === level.id && (
          <p className="indoor__picked" aria-live="polite">
            <strong>
              {selectedRoom.number} {selectedRoom.name}
            </strong>
            {selectedRoom.capacity != null && <span>{selectedRoom.capacity} seats</span>}
            {selectedRoom.features?.length ? <span>{selectedRoom.features.join(" · ")}</span> : null}
          </p>
        )}
      </div>

      <Directory building={building} levelId={level.id} selectedRoomId={selectedRoomId} onPick={pick} />
    </section>
  );
}
