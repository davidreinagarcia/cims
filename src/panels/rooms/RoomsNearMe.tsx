/** @file "Rooms near me" (T-61): geolocation -> haversine distance to Kendeda's and CULC's real footprint centroids -> a cross-building bookable-room list sorted nearest-first, feeding the shared ReservationGrid. Distance is to the building, never the room. */
import { useEffect, useState } from "react";
import { crossBuildingBookableRooms, type BookableRoom } from "../../indoor/availability";
import { indoorRooms } from "../../indoor/registry";
import { roomAmenitiesById } from "../../indoor/roomFinderDemo";
import { loadBuildings, loadedBuildings } from "../../lib/buildings";
import { formatDistance, getCurrentPosition, GeolocationError, haversineMeters } from "../../lib/geolocation";
import ReservationGrid from "./ReservationGrid";

/** The only two buildings with indoor/bookable data (see `buildingOptions.ts`) -- real ids verified in `src/data/buildings.geojson`. */
const NEARBY_BUILDING_IDS = ["kendeda-building-for-innovative-sustainable-design", "g-wayne-clough-undergraduate-learning-commons"] as const;

type Status =
  | { kind: "requesting" }
  | { kind: "error"; retryable: boolean; message: string }
  | { kind: "ready"; rooms: BookableRoom[] };

/**
 * Requests the browser's location once, sorts both bookable buildings' rooms by distance from it, and
 * hands the result to the shared reservation grid -- or shows a clear, honest fallback for every way
 * that can fail. `onBack` is omitted when mounted as a top-level section of `RoomsBoard.tsx` (T-62),
 * whose chip bar already doubles as navigation; `onlyAvailable` passes the board's "Only available
 * rooms" toggle straight through to the grid.
 */
export default function RoomsNearMe({ onBack, onlyAvailable }: { onBack?: () => void; onlyAvailable?: boolean }) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<Status>({ kind: "requesting" });

  useEffect(() => {
    let alive = true;
    setStatus({ kind: "requesting" });
    void (async () => {
      try {
        const [position, buildings] = await Promise.all([
          getCurrentPosition(),
          loadedBuildings() ? Promise.resolve(loadedBuildings()!) : loadBuildings(),
        ]);
        if (!alive) return;

        const distanceByBuilding = new Map<string, number>();
        for (const buildingId of NEARBY_BUILDING_IDS) {
          const center = buildings.byId.get(buildingId)?.center;
          if (center) distanceByBuilding.set(buildingId, haversineMeters({ lat: position.lat, lng: position.lng }, { lat: center[1], lng: center[0] }));
        }

        const rooms = crossBuildingBookableRooms(indoorRooms(), roomAmenitiesById)
          .filter((room) => distanceByBuilding.has(room.buildingId))
          .map((room) => ({ ...room, label: `${room.label} · ${formatDistance(distanceByBuilding.get(room.buildingId)!)}` }))
          .sort((a, b) => distanceByBuilding.get(a.buildingId)! - distanceByBuilding.get(b.buildingId)!
            || a.label.localeCompare(b.label, "en", { numeric: true }));

        setStatus({ kind: "ready", rooms });
      } catch (err) {
        if (!alive) return;
        if (err instanceof GeolocationError) setStatus({ kind: "error", retryable: err.reason !== "unsupported", message: err.message });
        else setStatus({ kind: "error", retryable: true, message: "Something went wrong finding your location. Please try again." });
      }
    })();
    return () => { alive = false; };
  }, [attempt]);

  return (
    <>
      {onBack && (
        <div className="reserve-building">
          <div className="reserve-building__info">
            <h3 className="reserve-building__title">Rooms near me</h3>
            <button type="button" className="cims-btn cims-btn--small" onClick={onBack}>Back</button>
          </div>
        </div>
      )}

      {status.kind === "requesting" && <p className="cims-muted" role="status">Requesting your location…</p>}

      {status.kind === "error" && (
        <div role="alert" className="reserve-nearby__error">
          <p className="reserve-grid__error"><strong>Couldn't use your location:</strong> {status.message}</p>
          <div className="cims-actions">
            {status.retryable && <button type="button" className="cims-btn" onClick={() => setAttempt((a) => a + 1)}>Try again</button>}
            {onBack && <button type="button" className="cims-btn" onClick={onBack}>Back to building picker</button>}
          </div>
        </div>
      )}

      {status.kind === "ready" && (
        <>
          <p className="cims-muted">
            Distance is to the building's location on the map, not to the room itself -- there's no indoor positioning. Nearest
            first, Kendeda and CULC only.
          </p>
          <ReservationGrid rooms={status.rooms} onlyAvailable={onlyAvailable} />
        </>
      )}
    </>
  );
}
