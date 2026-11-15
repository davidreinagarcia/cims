/** @file Step 2 of reserving a room (T-60): day/time grid of 30-minute slots per bookable room, a fixed or open-ended booking flow, and "My reservations here". */
import { useCallback, useEffect, useMemo, useState } from "react";
import { campusTimeToday, expandDemoSlots, isRoomFree } from "../../indoor/availability";
import { indoorRooms } from "../../indoor/registry";
import { demoSlotPatterns, roomAmenitiesById } from "../../indoor/roomFinderDemo";
import type { AvailabilitySlot, IndoorBuilding, RoomAmenities } from "../../indoor/types";
import {
  isReservationActive, MAX_DURATION_MINUTES, reservationBusyWindow, reservationsService, RENEWAL_WINDOW_MINUTES, SLOT_MINUTES,
  type NewReservation, type Reservation,
} from "../../lib/reservations";
import { useAuth } from "../../state/auth";

/** A bookable room in this building, with its (fictional-for-Kendeda, real-capacity-for-CULC) demo amenities. */
interface BookableRoom { id: string; name: string; amenities: RoomAmenities }

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

/** Every bookable room in `buildingId`, sorted by name, from the merged Kendeda/CULC demo amenities (`roomFinderDemo.ts`). */
function bookableRoomsFor(buildingId: string): BookableRoom[] {
  return indoorRooms()
    .filter((room) => room.building.building_id === buildingId)
    .flatMap((room) => {
      const amenities = roomAmenitiesById.get(room.id);
      return amenities?.bookable ? [{ id: room.id, name: room.space.name, amenities }] : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
}

/** Day/time grid, booking flow and "My reservations" for one building (Kendeda or CULC). */
export default function ReservationGrid({ building }: { building: IndoorBuilding }) {
  const { session, requireAuth } = useAuth();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const bookableRooms = useMemo(() => bookableRoomsFor(building.building_id), [building.building_id]);
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
  const refresh = useCallback(() => {
    void Promise.all(bookableRooms.map(async (room) => [room.id, await reservationsService.listForRoom(room.id)] as const))
      .then((entries) => setReservationsByRoom(Object.fromEntries(entries)));
    if (session) void reservationsService.listMineForBuilding(building.building_id, session.accountId).then(setMyReservations);
    else setMyReservations([]);
  }, [bookableRooms, building.building_id, session]);
  useEffect(() => { refresh(); }, [refresh, refreshKey]);

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
  // Open-ended only makes sense "from inside the room, right now": the selection's start slot has to contain the current instant.
  const openEndedEligible = !!(selectionWindow && now.getTime() >= selectionWindow.start.getTime() - 60_000 && now.getTime() < selectionWindow.start.getTime() + SLOT_MINUTES * 60_000);

  const [pending, setPending] = useState<NewReservation | null>(null);
  const [pendingCancel, setPendingCancel] = useState<string | null>(null);
  const [pendingRenew, setPendingRenew] = useState<string | null>(null);

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
      .then(() => { setSelection(null); setNotice(input.mode === "fixed" ? "Reserved." : "Reserved, open-ended. Renew it periodically from “My reservations here” below."); setRefreshKey((k) => k + 1); })
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
    if (!pendingRenew || !session) return;
    const id = pendingRenew;
    setPendingRenew(null);
    void reservationsService.renew(id, session.accountId)
      .then(() => { setNotice(`Renewed for another ${RENEWAL_WINDOW_MINUTES} minutes.`); setRefreshKey((k) => k + 1); })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Something went wrong. Please try again."));
  }, [pendingRenew, session]);

  function reserveFixed() {
    if (!selectedRoom || !selectionWindow) return;
    requireAuth(() => setPending({ room: selectedRoom.id, buildingId: building.building_id, roomLabel: selectedRoom.name, mode: "fixed", start: selectionWindow.start, end: selectionWindow.end }));
  }
  function reserveOpenEnded() {
    if (!selectedRoom) return;
    requireAuth(() => setPending({ room: selectedRoom.id, buildingId: building.building_id, roomLabel: selectedRoom.name, mode: "open-ended", start: new Date() }));
  }
  const cancelReservation = (id: string) => requireAuth(() => setPendingCancel(id));
  const renewReservation = (id: string) => requireAuth(() => setPendingRenew(id));

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
        <p className="cims-empty" role="status">No bookable rooms yet for this building.</p>
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
          {bookableRooms.map((room) => (
            <div className="reserve-grid__row" key={room.id}>
              <div className="reserve-grid__roomcell">
                <strong>{room.name}</strong>
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
                      aria-label={`${room.name}, ${timeFmt.format(start)}, ${cappedNeighbor ? "2-hour maximum reached" : status}`}
                      title={cappedNeighbor ? "2-hour maximum reached" : undefined}
                      onClick={() => onSlotClick(room.id, index)} />
                  );
                })}
              </div>
            </div>
          ))}
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
            <strong>{selectedRoom.name}</strong> &middot; {dayFmt.format(days[selectedDayIndex])} &middot;{" "}
            {timeFmt.format(selectionWindow.start)}–{timeFmt.format(selectionWindow.end)} ({selectionMinutes} min)
            {atMaxDuration && <span className="cims-muted"> &middot; 2-hour maximum reached</span>}
          </p>
          <div className="cims-actions reserve-confirm__actions">
            <button type="button" className="cims-btn cims-btn--primary" disabled={booking} onClick={reserveFixed}>
              {booking ? "Reserving…" : "Reserve"}
            </button>
            {openEndedEligible && (
              <button type="button" className="cims-btn" disabled={booking} onClick={reserveOpenEnded} title="Prototype: no QR/NFC presence check -- renew it yourself from this screen.">
                Reserve open-ended instead
              </button>
            )}
            <button type="button" className="cims-btn" onClick={() => setSelection(null)}>Clear</button>
          </div>
          {!session && <p className="cims-muted">Sign-in required to reserve &mdash; you'll be asked when you tap Reserve.</p>}
        </section>
      )}

      <section className="reserve-mine" aria-label="My reservations in this building">
        <h3 className="cims-caps">My reservations here</h3>
        {!session && <p className="cims-muted">Sign in to see and manage your reservations in this building.</p>}
        {session && myReservations.length === 0 && <p className="cims-muted">No reservations yet.</p>}
        {myReservations.length > 0 && (
          <ul className="reserve-mine__list">
            {myReservations.map((reservation) => {
              const active = isReservationActive(reservation, now);
              const window = reservationBusyWindow(reservation);
              return (
                <li className="reserve-mine__item" key={reservation.id}>
                  <div className="reserve-mine__info">
                    <strong>{reservation.roomLabel}</strong>
                    <span className="cims-muted">
                      {reservation.mode === "fixed"
                        ? `${dayFmt.format(new Date(reservation.start))}, ${timeFmt.format(new Date(reservation.start))}–${timeFmt.format(new Date(reservation.end!))}`
                        : active
                          ? `Open-ended since ${timeFmt.format(new Date(reservation.start))} — renew by ${timeFmt.format(new Date(window!.end))}`
                          : `Open-ended from ${timeFmt.format(new Date(reservation.start))} — released (missed renewal)`}
                    </span>
                    {!active && <span className="cims-tag">{reservation.mode === "open-ended" ? "Released" : "Ended"}</span>}
                  </div>
                  {active && (
                    <div className="cims-actions reserve-mine__actions">
                      {reservation.mode === "open-ended" && (
                        <button type="button" className="cims-btn cims-btn--small" onClick={() => renewReservation(reservation.id)}>Renew</button>
                      )}
                      <button type="button" className="cims-btn cims-btn--small" onClick={() => cancelReservation(reservation.id)}>Cancel</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="cims-muted reserve-mine__prototype">
          <span className="cims-tag cims-tag--alert">Prototype</span> Open-ended bookings have no real presence check (no
          QR/NFC/geofencing yet, see roadmap F-18): renew every {RENEWAL_WINDOW_MINUTES} minutes from here or the room
          releases itself automatically.
        </p>
      </section>
    </div>
  );
}
