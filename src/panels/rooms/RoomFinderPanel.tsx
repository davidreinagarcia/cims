/** @file Reserve-a-room entry point (F-11/F-20, T-60): pick a building, or jump to favorited rooms, then book a real (prototype) slot via ReservationGrid. */
import { useEffect, useState } from "react";
import { bookableRoomsFor, favoriteRoomsFrom } from "../../indoor/availability";
import { indoorFor, indoorRooms } from "../../indoor/registry";
import { roomAmenitiesById } from "../../indoor/roomFinderDemo";
import { preferredRoomsService, type PreferredRoom } from "../../lib/preferredRooms";
import { useAuth } from "../../state/auth";
import BuildingGlyph from "./BuildingGlyph";
import BuildingPicker from "./BuildingPicker";
import ReservationGrid from "./ReservationGrid";
import "./rooms.css";

/** Which first step the user is on: pick a building, browse favorited rooms, or a chosen building's grid. */
type Screen = { kind: "picker" } | { kind: "favorites" } | { kind: "building"; buildingId: string };

/**
 * Sidebar tab: "Reserve a room" entry point, replacing the read-only room finder (T-24) with a
 * working (prototype) reservation flow. Two ways in: pick a building (`BuildingPicker`) or, once the
 * user has favorited at least one room (heart icon in `ReservationGrid`), jump straight to a
 * cross-building "Preferred rooms" grid. Either way the day/time grid and booking flow is the same
 * `ReservationGrid`, just given a different room list. Only Kendeda and CULC have indoor data, so
 * those are the only two buildings that go past the picker (PRD F-20, promoted for this scope, see
 * docs/02-mvp.md and docs/03-prd.md).
 */
export default function RoomFinderPanel() {
  const { session } = useAuth();
  const [screen, setScreen] = useState<Screen>({ kind: "picker" });
  const [favorites, setFavorites] = useState<PreferredRoom[]>([]);

  useEffect(() => {
    if (screen.kind !== "picker") return; // re-check when the user comes back here, e.g. after favoriting a room
    if (!session) { setFavorites([]); return; }
    let alive = true;
    void preferredRoomsService.list(session.accountId).then((list) => { if (alive) setFavorites(list); });
    return () => { alive = false; };
  }, [screen.kind, session]);

  const building = screen.kind === "building" ? indoorFor(screen.buildingId) : undefined;
  const rooms = screen.kind === "building" && building
    ? bookableRoomsFor(indoorRooms(), roomAmenitiesById, building.building_id)
    : screen.kind === "favorites"
      ? favoriteRoomsFrom(indoorRooms(), roomAmenitiesById, new Set(favorites.map((f) => f.room)))
      : null;

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

      {screen.kind === "picker" && (
        <div className="reserve-favorites-entry">
          {favorites.length > 0 ? (
            <button type="button" className="cims-btn cims-btn--block" onClick={() => setScreen({ kind: "favorites" })}>
              ♥ My preferred rooms ({favorites.length})
            </button>
          ) : (
            <p className="cims-muted">Heart a room below to pin it here for quick rebooking.</p>
          )}
        </div>
      )}

      {screen.kind === "favorites" ? (
        <>
          <div className="reserve-building">
            <div className="reserve-building__info">
              <h3 className="reserve-building__title">My preferred rooms</h3>
              <button type="button" className="cims-btn cims-btn--small" onClick={() => setScreen({ kind: "picker" })}>Back</button>
            </div>
          </div>
          <ReservationGrid key="favorites" rooms={rooms ?? []} />
        </>
      ) : building ? (
        <>
          <div className="reserve-building">
            <BuildingGlyph buildingId={building.building_id} />
            <div className="reserve-building__info">
              <h3 className="reserve-building__title">{building.title}</h3>
              <button type="button" className="cims-btn cims-btn--small" onClick={() => setScreen({ kind: "picker" })}>Change building</button>
            </div>
          </div>
          <ReservationGrid key={building.building_id} rooms={rooms ?? []} />
        </>
      ) : (
        <BuildingPicker onPick={(buildingId) => setScreen({ kind: "building", buildingId })} />
      )}
    </section>
  );
}
