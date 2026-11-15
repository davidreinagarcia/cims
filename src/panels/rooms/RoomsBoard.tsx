/** @file Full-page Rooms board (T-62): top filter-chip bar (buildings, Favorites, Rooms near me, My bookings, plus an "Only available rooms" toggle) over the day/slot grid, mirroring how `panels/bulletin/BulletinBoard.tsx` takes over the screen for the Bulletin. Assembles existing T-20/T-21/T-24/T-60/T-61 pieces -- it does not reimplement the reservation or availability engine. */
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { bookableRoomsFor, favoriteRoomsFrom } from "../../indoor/availability";
import { clearBookingRequest, peekBookingRequest, useBookingRequestSeq } from "../../indoor/handoff";
import { indoorFor, indoorRooms } from "../../indoor/registry";
import { roomAmenitiesById } from "../../indoor/roomFinderDemo";
import { preferredRoomsService, type PreferredRoom } from "../../lib/preferredRooms";
import { Icon } from "../../shell/icons";
import { useAuth } from "../../state/auth";
import { BUILDING_OPTIONS } from "./buildingOptions";
import BuildingGlyph from "./BuildingGlyph";
import MyBookingsSection from "./MyBookingsSection";
import ReservationGrid from "./ReservationGrid";
import RoomsNearMe from "./RoomsNearMe";
import "./rooms.css";
import "./rooms-board.css";

const FOCUSABLE = "button:not([disabled]), input, a[href], [tabindex]:not([tabindex='-1'])";

/** Which top-level section the board shows: the landing "search for a building" prompt, one bookable building's grid, the cross-building favorites grid, the distance-sorted nearby grid, or the user's own bookings. */
type Section = { kind: "search" } | { kind: "building"; buildingId: string; roomId?: string } | { kind: "favorites" } | { kind: "nearby" } | { kind: "bookings" };

function initialSection(): Section {
  // "Book this room" on an indoor room card (useBookingRequestSeq, src/shell/Shell.tsx) opens straight on that room's row;
  // "Go back to bookings" (from a room card, a filed report, a place card...) opens straight on My bookings.
  const request = peekBookingRequest();
  if (request?.kind === "room") return { kind: "building", buildingId: request.buildingId, roomId: request.roomId };
  if (request?.kind === "bookings") return { kind: "bookings" };
  // Otherwise open on Rooms near me, so the board shows rooms right away instead of an empty search prompt.
  return { kind: "nearby" };
}

/**
 * Full-screen "Rooms" takeover, replacing the small floating-card/bottom-sheet `RoomFinderPanel`
 * (T-60/T-61) with a top chip bar like `BulletinBoard.tsx`'s: one chip per bookable building (plus
 * disabled "Coming soon" chips for the rest, reusing `buildingOptions.ts`'s single list), Favorites,
 * Rooms near me and My bookings as mutually-exclusive sections, with an independent "Only available
 * rooms" toggle chip (T-62) that narrows whichever section is showing to rooms free right now. The
 * shell mounts this whenever `panel === "rooms"` (`src/shell/Shell.tsx`), the same way it mounts
 * `BulletinBoard` outside the floating-card system.
 */
export default function RoomsBoard({ onClose }: { onClose: () => void }) {
  const { session } = useAuth();
  const root = useRef<HTMLDialogElement>(null);
  const [section, setSection] = useState<Section>(initialSection);
  useEffect(() => clearBookingRequest(), []);
  // A "Go back to bookings"/"My bookings" button clicked from *inside* this already-mounted board
  // (the reservation confirm panel, say) publishes a request the same way every other call site
  // does, but the shell's own effect (setPanel("rooms")) is a no-op here since the panel never
  // changes -- so this board has to notice the request itself and switch section live.
  const bookingSeq = useBookingRequestSeq();
  const mountBookingSeq = useRef(bookingSeq);
  useEffect(() => {
    if (bookingSeq === mountBookingSeq.current) return;
    const request = peekBookingRequest();
    if (request?.kind === "bookings") setSection({ kind: "bookings" });
    else if (request?.kind === "room") setSection({ kind: "building", buildingId: request.buildingId, roomId: request.roomId });
    clearBookingRequest();
  }, [bookingSeq]);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [comingSoon, setComingSoon] = useState<string | null>(null);
  const [buildingQuery, setBuildingQuery] = useState("");
  const buildingMatches = buildingQuery.trim()
    ? BUILDING_OPTIONS.filter((option) => option.label.toLowerCase().includes(buildingQuery.trim().toLowerCase()))
    : [];
  const [favorites, setFavorites] = useState<PreferredRoom[]>([]);
  const [bookingsCount, setBookingsCount] = useState(0);

  useEffect(() => {
    const element = root.current;
    element?.showModal();
    element?.querySelector<HTMLElement>(".rooms-board__back")?.focus();
    return () => { element?.close(); };
  }, []);

  // Refetched whenever the active section changes -- the moment a heart toggled inside whichever
  // grid is currently mounted would most likely show up, same spirit as the old panel's "re-check
  // when the user comes back here" comment.
  useEffect(() => {
    if (!session) { setFavorites([]); return; }
    let alive = true;
    void preferredRoomsService.list(session.accountId).then((list) => { if (alive) setFavorites(list); });
    return () => { alive = false; };
  }, [session, section]);

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key !== "Tab") return;
    const items = Array.from(root.current!.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === root.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
  };

  function pickBuilding(option: { id: string; label: string; enabled: boolean }) {
    setBuildingQuery("");
    if (!option.enabled) { setComingSoon(option.label); return; }
    setComingSoon(null);
    setSection({ kind: "building", buildingId: option.id });
  }

  const currentBuildingLabel = section.kind === "building"
    ? BUILDING_OPTIONS.find((option) => option.id === section.buildingId)?.label : undefined;

  const building = section.kind === "building" ? indoorFor(section.buildingId) : undefined;
  const rooms = section.kind === "building" && building
    ? bookableRoomsFor(indoorRooms(), roomAmenitiesById, building.building_id).filter((room) => !section.roomId || room.id === section.roomId)
    : section.kind === "favorites"
      ? favoriteRoomsFrom(indoorRooms(), roomAmenitiesById, new Set(favorites.map((f) => f.room)))
      : [];

  return (
    <dialog ref={root} className="rooms-board" role="dialog" aria-modal="true" aria-labelledby="rooms-board-title" tabIndex={-1} onKeyDown={onKeyDown}
      onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <header className="rooms-board__bar">
        <h2 id="rooms-board-title" className="rooms-board__title">
          Rooms{" "}
          <span className="cims-tag cims-tag--alert" title="Capacity, features, schedule and bookings are seeded/mocked on this device -- not a real GT system.">DEMO</span>
        </h2>
        <button type="button" className="rooms-board__btn rooms-board__back" onClick={onClose}>
          <Icon name="left" size={18} /> Back to map
        </button>
      </header>
      <div className="rooms-board__sub">
        <p className="cims-muted">
          Reserve now: see what's free in Kendeda or CULC today (or the next few days) and book it on the spot. There is
          no real GT booking feed yet (PRD F-11/F-20) -- capacity is real for published rooms, but the schedule and the
          booking itself are a working prototype stored only on this device.
        </p>
      </div>
      <div className="rooms-board__surface">
        <div className="rooms-board__chips" role="group" aria-label="Filter rooms">
          <div className="rooms-board__search">
            <div className="cims-field">
              <input type="text" value={buildingQuery} placeholder={currentBuildingLabel ?? "Search a building..."}
                aria-label="Search a building" role="combobox" aria-expanded={buildingMatches.length > 0}
                onChange={(event) => setBuildingQuery(event.target.value)} />
            </div>
            {buildingMatches.length > 0 && (
              <ul className="rooms-board__search-results" role="listbox">
                {buildingMatches.map((option) => (
                  <li key={option.id}>
                    <button type="button" className="rooms-board__search-result" role="option" onClick={() => pickBuilding(option)}>
                      {option.label}
                      {option.enabled
                        ? <span className="rooms-board__count">{bookableRoomsFor(indoorRooms(), roomAmenitiesById, option.id).length}</span>
                        : <span className="cims-tag cims-tag--alert">Coming soon</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button type="button" className="rooms-board__chip" aria-pressed={section.kind === "nearby"} onClick={() => setSection({ kind: "nearby" })}>
            Rooms near me
          </button>
          <button type="button" className="rooms-board__chip rooms-board__chip--toggle" aria-pressed={onlyAvailable}
            onClick={() => setOnlyAvailable(!onlyAvailable)}>
            Only available rooms
          </button>
          <button type="button" className="rooms-board__chip" aria-pressed={section.kind === "favorites"} onClick={() => setSection({ kind: "favorites" })}>
            Favorites <span className="rooms-board__count">{favorites.length}</span>
          </button>
          <button type="button" className="rooms-board__chip rooms-board__chip--primary" aria-pressed={section.kind === "bookings"} onClick={() => setSection({ kind: "bookings" })}>
            My bookings <span className="rooms-board__count">{bookingsCount}</span>
          </button>
        </div>

        {comingSoon && (
          <p className="cims-muted" role="status" aria-live="polite">
            {comingSoon} is coming soon -- only Kendeda and CULC have indoor data to reserve rooms in yet.
          </p>
        )}

        {section.kind === "search" ? (
          <p className="cims-empty" role="status">
            Search for a building above, or pick Rooms near me, Favorites or My bookings.
          </p>
        ) : section.kind === "bookings" ? (
          <MyBookingsSection onCountChange={setBookingsCount} />
        ) : section.kind === "nearby" ? (
          <RoomsNearMe onlyAvailable={onlyAvailable} />
        ) : section.kind === "favorites" ? (
          <ReservationGrid key="favorites" rooms={rooms} onlyAvailable={onlyAvailable} />
        ) : building ? (
          <>
            <div className="reserve-building">
              <BuildingGlyph buildingId={building.building_id} />
              <div className="reserve-building__info">
                <h3 className="reserve-building__title">{building.title}</h3>
                {section.roomId && <button type="button" className="cims-btn cims-btn--small"
                  onClick={() => setSection({ kind: "building", buildingId: building.building_id })}>All rooms here</button>}
              </div>
            </div>
            <ReservationGrid key={`${building.building_id}:${section.roomId ?? ""}`} rooms={rooms} onlyAvailable={onlyAvailable} />
          </>
        ) : null}
      </div>
    </dialog>
  );
}
