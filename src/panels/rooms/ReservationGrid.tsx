/** @file Step 2 of reserving a room (T-60/T-61): day/time grid of 30-minute slots per bookable room (own building, a cross-building favorites list, or a "rooms near me" list), the booking flow, location check-in, "Get directions" and "My reservations here". */
import { useCallback, useEffect, useMemo, useState } from "react";
import { campusTimeToday, expandDemoSlots, isRoomFree, type BookableRoom } from "../../indoor/availability";
import { demoSlotPatterns } from "../../indoor/roomFinderDemo";
import type { AvailabilitySlot } from "../../indoor/types";
import { loadBuildings, loadedBuildings } from "../../lib/buildings";
import { formatDistance, getCurrentPosition, haversineMeters } from "../../lib/geolocation";
import { preferredRoomsService, type PreferredRoom } from "../../lib/preferredRooms";
import {
  CHECKIN_RADIUS_METERS, CHECKIN_WINDOW_MINUTES, checkinDeadline, isReservationActive, MAX_DURATION_MINUTES, REBOOK_COOLDOWN_MINUTES,
  reservationBusyWindow, reservationsService, reservationStatus, SLOT_MINUTES, type NewReservation, type Reservation,
} from "../../lib/reservations";
import { useAuth } from "../../state/auth";
import { useSelection } from "../../state/selection";

/** An in-progress tap-to-extend selection: slots `startIndex` (inclusive) to `endIndex` (exclusive) on one room/day. */
interface GridSelection { room: string; dayIndex: number; startIndex: number; endIndex: number }

const DAY_COUNT = 4; // today + 3 more, enough to show the pattern without an endless list
const DISPLAY_TIMES = (() => {
  const times: string[] = [];
  for (let hour = 7; hour < 22; hour++) times.push(`${String(hour).padStart(2, "0")}:00`, `${String(hour).padStart(2, "0")}:30`);
  return times; // "07:00" .. "21:30": the grid's visible booking window, not a published building-hours fact
})();
const MAX_SLOTS = MAX_DURATION_MINUTES / SLOT_MINUTES;

const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit", hour12: true });
const hourFmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: true });
const dayFmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric" });

/** A small outline/filled heart used for the "Preferred rooms" toggle; purely decorative, the button carries the label. */
function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path
        d="M12 20.2s-7.2-4.4-9.6-8.9C.8 7.8 2.1 4.3 5.5 4.3c2 0 3.4 1.2 4.2 2.4.1.2.3.2.6 0 .8-1.2 2.2-2.4 4.2-2.4 3.4 0 4.7 3.5 3.1 7-2.4 4.5-9.6 8.9-9.6 8.9z"
        fill={filled ? "var(--gold)" : "none"} stroke="var(--ink)" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Day/time grid, booking flow, favorites, location check-in and "My reservations" for any list of
 * bookable rooms -- one building's rooms (`RoomFinderPanel`'s building screen), a cross-building
 * favorites list ("Preferred rooms"), or a cross-building distance-sorted list ("Rooms near me",
 * T-61). All three pass the same `BookableRoom[]` shape (`indoor/availability.ts#bookableRoomsFor` /
 * `#favoriteRoomsFrom` / `#crossBuildingBookableRooms`), so this component never needs to know which
 * one it's showing.
 */
export default function ReservationGrid({ rooms }: { rooms: BookableRoom[] }) {
  const { session, requireAuth } = useAuth();
  const { select } = useSelection();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const bookableRooms = rooms;
  const roomIds = useMemo(() => new Set(bookableRooms.map((room) => room.id)), [bookableRooms]);
  const days = useMemo(() => Array.from({ length: DAY_COUNT }, (_, i) => new Date(now.getTime() + i * 86_400_000)), [now]);
  // boundaries[dayIndex][slotIndex] = the half-open instant window that slot covers, in campus-local time.
  const boundaries = useMemo(() => days.map((day) => {
    const starts = DISPLAY_TIMES.map((time) => campusTimeToday(day, time) ?? day);
    const ends = [...starts.slice(1), campusTimeToday(day, "22:00") ?? day];
    return starts.map((start, i) => ({ start, end: ends[i] }));
  }), [days]);

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selection, setSelection] = useState<GridSelection | null>(null);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [reservationsByRoom, setReservationsByRoom] = useState<Record<string, Reservation[]>>({});
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [favorites, setFavorites] = useState<PreferredRoom[]>([]);
  const refresh = useCallback(() => {
    void Promise.all(bookableRooms.map(async (room) => [room.id, await reservationsService.listForRoom(room.id)] as const))
      .then((entries) => setReservationsByRoom(Object.fromEntries(entries)));
    if (session) {
      void reservationsService.listMine(session.accountId).then((mine) => setMyReservations(mine.filter((r) => roomIds.has(r.room))));
      void preferredRoomsService.list(session.accountId).then(setFavorites);
    } else {
      setMyReservations([]);
      setFavorites([]);
    }
  }, [bookableRooms, roomIds, session]);
  useEffect(() => { refresh(); }, [refresh, refreshKey]);
  const favoriteIds = useMemo(() => new Set(favorites.map((f) => f.room)), [favorites]);

  const busyFromReservations = useMemo(() => Object.values(reservationsByRoom).flat()
    .filter((reservation) => isReservationActive(reservation, now))
    .map(reservationBusyWindow)
    .filter((window): window is AvailabilitySlot => window !== null),
  [reservationsByRoom, now]);

  const daySlots = useMemo(() => {
    const day = days[selectedDayIndex];
    const nextDay = new Date(day.getTime() + 86_400_000);
    return [...expandDemoSlots(demoSlotPatterns, day), ...expandDemoSlots(demoSlotPatterns, nextDay), ...busyFromReservations];
  }, [days, selectedDayIndex, busyFromReservations]);

  const cellFree = useCallback((roomId: string, index: number): boolean => {
    const { start, end } = boundaries[selectedDayIndex][index];
    return isRoomFree(roomId, daySlots, { start, end });
  }, [boundaries, selectedDayIndex, daySlots]);
  const cellPast = useCallback((index: number): boolean => boundaries[selectedDayIndex][index].end.getTime() <= now.getTime(), [boundaries, selectedDayIndex, now]);

  function pickDay(index: number) {
    setSelectedDayIndex(index);
    setSelection(null);
    setError(null);
  }

  function onSlotClick(roomId: string, index: number) {
    if (!cellFree(roomId, index) || cellPast(index)) return;
    setError(null);
    setNotice(null);
    setSelection((current) => {
      if (!current || current.room !== roomId || current.dayIndex !== selectedDayIndex) {
        return { room: roomId, dayIndex: selectedDayIndex, startIndex: index, endIndex: index + 1 };
      }
      const span = current.endIndex - current.startIndex;
      if (index === current.startIndex && span === 1) return null; // tap the lone selected slot again to clear it
      if (index === current.endIndex && span < MAX_SLOTS) return { ...current, endIndex: index + 1 }; // extend forward
      if (index === current.startIndex - 1 && span < MAX_SLOTS) return { ...current, startIndex: index }; // extend backward
      return { room: roomId, dayIndex: selectedDayIndex, startIndex: index, endIndex: index + 1 }; // start fresh elsewhere
    });
  }

  const activeSelection = selection?.dayIndex === selectedDayIndex ? selection : null;
  const selectedRoom = activeSelection && bookableRooms.find((room) => room.id === activeSelection.room);
  const selectionWindow = activeSelection && {
    start: boundaries[activeSelection.dayIndex][activeSelection.startIndex].start,
    end: boundaries[activeSelection.dayIndex][activeSelection.endIndex - 1].end,
  };
  const selectionMinutes = selectionWindow ? Math.round((selectionWindow.end.getTime() - selectionWindow.start.getTime()) / 60_000) : 0;
  const atMaxDuration = activeSelection ? activeSelection.endIndex - activeSelection.startIndex >= MAX_SLOTS : false;

  const [pending, setPending] = useState<NewReservation | null>(null);
  const [pendingCancel, setPendingCancel] = useState<string | null>(null);
  const [pendingCheckIn, setPendingCheckIn] = useState<string | null>(null);
  const [pendingFavorite, setPendingFavorite] = useState<{ room: BookableRoom; next: boolean } | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  // Each of these resumes automatically once `session` appears, which is exactly how F-21's sign-in
  // gate is supposed to work ("the action continues where I left off") -- a closure captured at click
  // time would still hold the stale (signed-out) session, so the pending-then-effect handoff is load-bearing here.
  useEffect(() => {
    if (!pending || !session) return;
    const input = pending;
    setPending(null);
    setBooking(true);
    setError(null);
    void reservationsService.create(input, session.accountId)
      .then(() => { setSelection(null); setNotice(`Reserved. Check in within ${CHECKIN_WINDOW_MINUTES} minutes of the start time from “My reservations here” below, or it releases automatically.`); setRefreshKey((k) => k + 1); })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Something went wrong saving on this device. Please try again."))
      .finally(() => setBooking(false));
  }, [pending, session]);
  useEffect(() => {
    if (!pendingCancel || !session) return;
    const id = pendingCancel;
    setPendingCancel(null);
    void reservationsService.cancel(id, session.accountId)
      .then(() => { setNotice("Reservation cancelled."); setRefreshKey((k) => k + 1); })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Something went wrong. Please try again."));
  }, [pendingCancel, session]);
  useEffect(() => {
    if (!pendingCheckIn || !session) return;
    const id = pendingCheckIn;
    const accountId = session.accountId;
    const reservation = myReservations.find((r) => r.id === id);
    setPendingCheckIn(null);
    if (!reservation) return;
    setCheckingIn(true);
    setError(null);
    void (async () => {
      try {
        // Location check-in (T-61): re-read the browser's position and confirm it's within
        // CHECKIN_RADIUS_METERS of the room's *building* centroid -- necessarily building-level,
        // since there's no indoor positioning hardware. Only on success does the service record
        // checkedInAt; a too-far fix never touches the reservation.
        const [position, buildings] = await Promise.all([
          getCurrentPosition(),
          loadedBuildings() ? Promise.resolve(loadedBuildings()!) : loadBuildings(),
        ]);
        const center = buildings.byId.get(reservation.buildingId)?.center;
        if (!center) throw new Error("This building's location isn't loaded on this device yet -- try again in a moment.");
        const distance = haversineMeters({ lat: position.lat, lng: position.lng }, { lat: center[1], lng: center[0] });
        if (distance > CHECKIN_RADIUS_METERS) {
          throw new Error(`You're ${formatDistance(distance)} from the building -- check-in needs you within about ${CHECKIN_RADIUS_METERS} m of it. Get closer and try again.`);
        }
        await reservationsService.checkIn(id, accountId);
        setNotice("Checked in -- enjoy the room.");
        setRefreshKey((k) => k + 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong getting your location. Please try again.");
      } finally {
        setCheckingIn(false);
      }
    })();
  }, [pendingCheckIn, session, myReservations]);
  useEffect(() => {
    if (!pendingFavorite || !session) return;
    const { room, next } = pendingFavorite;
    setPendingFavorite(null);
    const op = next
      ? preferredRoomsService.add({ room: room.id, buildingId: room.buildingId, roomLabel: room.label }, session.accountId)
      : preferredRoomsService.remove(room.id, session.accountId);
    void op.then(() => setRefreshKey((k) => k + 1))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Something went wrong. Please try again."));
  }, [pendingFavorite, session]);

  function reserve() {
    if (!selectedRoom || !selectionWindow) return;
    requireAuth(() => setPending({ room: selectedRoom.id, buildingId: selectedRoom.buildingId, roomLabel: selectedRoom.label, start: selectionWindow.start, end: selectionWindow.end }));
  }
  const cancelReservation = (id: string) => requireAuth(() => setPendingCancel(id));
  const checkIn = (id: string) => requireAuth(() => setPendingCheckIn(id));
  const toggleFavorite = (room: BookableRoom) => requireAuth(() => setPendingFavorite({ room, next: !favoriteIds.has(room.id) }));
  /** Opens the existing indoor building screen routed to this room -- the same selection the search/room-finder results have always used (BuildingView.tsx reads it via registry.ts#resolveRoom). Also how someone would actually get there in time to check in. */
  const getDirections = (roomId: string) => select({ kind: "room", id: roomId });

  function slotClass(roomId: string, index: number, free: boolean, past: boolean): string {
    const selected = !!(activeSelection && activeSelection.room === roomId && index >= activeSelection.startIndex && index < activeSelection.endIndex);
    if (selected) return "reserve-slot reserve-slot--selected";
    if (!free || past) return "reserve-slot reserve-slot--busy";
    const cappedNeighbor = !!(activeSelection && activeSelection.room === roomId && atMaxDuration
      && (index === activeSelection.endIndex || index === activeSelection.startIndex - 1));
    return cappedNeighbor ? "reserve-slot reserve-slot--free reserve-slot--capped" : "reserve-slot reserve-slot--free";
  }

  return (
    <div className="reserve-grid-screen">
      <div className="reserve-grid__days" role="group" aria-label="Day">
        {days.map((day, index) => (
          <button key={index} type="button" className="cims-chip" aria-pressed={index === selectedDayIndex} onClick={() => pickDay(index)}>
            {index === 0 ? "Today" : dayFmt.format(day)}
          </button>
        ))}
      </div>

      {bookableRooms.length === 0 ? (
        <p className="cims-empty" role="status">No bookable rooms to show.</p>
      ) : (
        <div className="reserve-grid" role="group" aria-label={`Availability for ${dayFmt.format(days[selectedDayIndex])}`}>
          <div className="reserve-grid__row reserve-grid__row--header">
            <div className="reserve-grid__roomcell" aria-hidden="true" />
            <div className="reserve-grid__cells" aria-hidden="true">
              {DISPLAY_TIMES.map((_, index) => (
                <span key={index} className="reserve-grid__hour">
                  {index % 2 === 0 ? hourFmt.format(boundaries[selectedDayIndex][index].start).replace(" ", "") : ""}
                </span>
              ))}
            </div>
          </div>
          {bookableRooms.map((room) => {
            const favorited = favoriteIds.has(room.id);
            return (
              <div className="reserve-grid__row" key={room.id}>
                <div className="reserve-grid__roomcell">
                  <div className="reserve-grid__roomhead">
                    <strong>{room.label}</strong>
                    <button type="button" className={`reserve-heart${favorited ? " reserve-heart--active" : ""}`}
                      aria-pressed={favorited}
                      aria-label={`${favorited ? "Remove" : "Add"} ${room.label} ${favorited ? "from" : "to"} preferred rooms`}
                      onClick={() => toggleFavorite(room)}>
                      <HeartIcon filled={favorited} />
                    </button>
                  </div>
                  <span className="cims-mono cims-muted">
                    {room.amenities.capacity !== undefined && <>Up to {room.amenities.capacity} &middot; </>}
                    {(room.amenities.features ?? []).join(", ") || "No listed features"}
                  </span>
                </div>
                <div className="reserve-grid__cells">
                  {DISPLAY_TIMES.map((_, index) => {
                    const free = cellFree(room.id, index);
                    const past = cellPast(index);
                    const selected = !!(activeSelection && activeSelection.room === room.id && index >= activeSelection.startIndex && index < activeSelection.endIndex);
                    const cappedNeighbor = !selected && !!(activeSelection && activeSelection.room === room.id && atMaxDuration
                      && (index === activeSelection.endIndex || index === activeSelection.startIndex - 1));
                    const { start } = boundaries[selectedDayIndex][index];
                    const status = selected ? "selected" : past ? "past" : free ? "free" : "busy";
                    return (
                      <button key={index} type="button" className={slotClass(room.id, index, free, past)}
                        disabled={(!free || past || cappedNeighbor) && !selected}
                        aria-pressed={selected}
                        aria-label={`${room.label}, ${timeFmt.format(start)}, ${cappedNeighbor ? "2-hour maximum reached" : status}`}
                        title={cappedNeighbor ? "2-hour maximum reached" : undefined}
                        onClick={() => onSlotClick(room.id, index)} />
                    );
                  })}
                </div>
              </div>
            );
          })}
          <ul className="reserve-grid__legend">
            <li><span className="reserve-slot reserve-slot--free" aria-hidden="true" /> Free</li>
            <li><span className="reserve-slot reserve-slot--busy" aria-hidden="true" /> Busy</li>
            <li><span className="reserve-slot reserve-slot--selected" aria-hidden="true" /> Selected</li>
          </ul>
        </div>
      )}

      {error && <p className="reserve-grid__error" role="alert"><strong>Error:</strong> {error}</p>}
      {notice && <p className="cims-muted" role="status">{notice}</p>}

      {selectedRoom && selectionWindow && (
        <section className="reserve-confirm" aria-live="polite" aria-label="Confirm reservation">
          <p>
            <strong>{selectedRoom.label}</strong> &middot; {dayFmt.format(days[selectedDayIndex])} &middot;{" "}
            {timeFmt.format(selectionWindow.start)}–{timeFmt.format(selectionWindow.end)} ({selectionMinutes} min)
            {atMaxDuration && <span className="cims-muted"> &middot; 2-hour maximum reached</span>}
          </p>
          <div className="cims-actions reserve-confirm__actions">
            <button type="button" className="cims-btn cims-btn--primary" disabled={booking} onClick={reserve}>
              {booking ? "Reserving…" : "Reserve"}
            </button>
            <button type="button" className="cims-btn" onClick={() => setSelection(null)}>Clear</button>
          </div>
          <p className="cims-muted">
            After reserving, check in within {CHECKIN_WINDOW_MINUTES} minutes of the start time using this device's location
            (see "My reservations here" below) or the room releases automatically for someone else.
          </p>
          {!session && <p className="cims-muted">Sign-in required to reserve &mdash; you'll be asked when you tap Reserve.</p>}
        </section>
      )}

      <section className="reserve-mine" aria-label="My reservations">
        <h3 className="cims-caps">My reservations here</h3>
        {!session && <p className="cims-muted">Sign in to see and manage your reservations.</p>}
        {session && myReservations.length === 0 && <p className="cims-muted">No reservations yet.</p>}
        {myReservations.length > 0 && (
          <ul className="reserve-mine__list">
            {myReservations.map((reservation) => {
              const status = reservationStatus(reservation, now);
              const deadline = checkinDeadline(reservation);
              const timeRange = `${dayFmt.format(new Date(reservation.start))}, ${timeFmt.format(new Date(reservation.start))}–${timeFmt.format(new Date(reservation.end))}`;
              const statusLine: Record<typeof status, string> = {
                "pending-checkin": `Check in by ${timeFmt.format(deadline)} (within ${CHECKIN_WINDOW_MINUTES} min of the start) or this releases automatically.`,
                "checked-in": "Checked in -- enjoy the room.",
                "ending-soon": `Ending soon -- wraps up at ${timeFmt.format(new Date(reservation.end))}.`,
                "no-show-released": "Released automatically -- no check-in within the window.",
                "ended": "Ended.",
                "cancelled": "Cancelled.",
              };
              const canCheckIn = status === "pending-checkin";
              const canCancel = status === "pending-checkin" || status === "checked-in" || status === "ending-soon";
              return (
                <li className="reserve-mine__item" key={reservation.id}>
                  <div className="reserve-mine__info">
                    <strong>{reservation.roomLabel}</strong>
                    <span className="cims-muted">{timeRange}</span>
                    <span className={status === "pending-checkin" || status === "ending-soon" ? "reserve-mine__reminder" : "cims-muted"}>
                      {statusLine[status]}
                    </span>
                    {(status === "no-show-released" || status === "ended") && <span className="cims-tag">{status === "no-show-released" ? "Released" : "Ended"}</span>}
                  </div>
                  <div className="cims-actions reserve-mine__actions">
                    <button type="button" className="cims-btn cims-btn--small" onClick={() => getDirections(reservation.room)}>Get directions</button>
                    {canCheckIn && (
                      <button type="button" className="cims-btn cims-btn--small cims-btn--primary" disabled={checkingIn} onClick={() => checkIn(reservation.id)}>
                        {checkingIn ? "Checking in…" : "Check in"}
                      </button>
                    )}
                    {canCancel && (
                      <button type="button" className="cims-btn cims-btn--small" onClick={() => cancelReservation(reservation.id)}>Cancel</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="cims-muted reserve-mine__prototype">
          <span className="cims-tag cims-tag--alert">Prototype</span> Check-in confirms you're within about {CHECKIN_RADIUS_METERS} m
          of the <em>building</em> using this device's location -- there's no indoor positioning, so it can't confirm you're in the
          room itself. No check-in within {CHECKIN_WINDOW_MINUTES} minutes of the start releases the room automatically for someone
          else. After a reservation ends, this account can't immediately rebook the same room for {REBOOK_COOLDOWN_MINUTES} minutes
          (a different room is fine right away). Check-in state and reservations live only on this device/browser. "Get directions"
          is also how you'd actually get there in time to check in.
        </p>
      </section>
    </div>
  );
}
