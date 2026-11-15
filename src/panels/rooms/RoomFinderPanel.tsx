/** @file Reserve-a-room entry point (F-11/F-20, T-60): pick a building, then book a real (prototype) slot via ReservationGrid. */
import { useState } from "react";
import { indoorFor } from "../../indoor/registry";
import BuildingGlyph from "./BuildingGlyph";
import BuildingPicker from "./BuildingPicker";
import ReservationGrid from "./ReservationGrid";
import "./rooms.css";

/**
 * Sidebar tab: "Reserve a room" entry point, replacing the read-only room finder (T-24) with a
 * working (prototype) reservation flow -- pick a building (`BuildingPicker`), then see its day/time
 * grid and book, renew or cancel (`ReservationGrid`). Only Kendeda and CULC have indoor data, so
 * those are the only two buildings that go past the picker (PRD F-20, promoted for this scope, see
 * docs/02-mvp.md and docs/03-prd.md).
 */
export default function RoomFinderPanel() {
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const building = buildingId ? indoorFor(buildingId) : undefined;

  return (
    <section className="room-finder" aria-label="Reserve a room">
      <h2 className="cims-caps">
        Reserve a room{" "}
        <span className="cims-tag cims-tag--alert" title="Capacity, features, schedule and bookings are seeded/mocked on this device -- not a real GT system.">DEMO</span>
      </h2>
      <p className="cims-muted room-finder__intro">
        Reserve now: see what's free in Kendeda or CULC today (or the next few days) and book it on the spot. There is
        no real GT booking feed yet (PRD F-11/F-20) -- capacity is real for published rooms, but the schedule and the
        booking itself are a working prototype stored only on this device.
      </p>

      {building ? (
        <>
          <div className="reserve-building">
            <BuildingGlyph buildingId={building.building_id} />
            <div className="reserve-building__info">
              <h3 className="reserve-building__title">{building.title}</h3>
              <button type="button" className="cims-btn cims-btn--small" onClick={() => setBuildingId(null)}>Change building</button>
            </div>
          </div>
          <ReservationGrid key={building.building_id} building={building} />
        </>
      ) : (
        <BuildingPicker onPick={setBuildingId} />
      )}
    </section>
  );
}
