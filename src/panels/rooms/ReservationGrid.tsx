/** @file Step 2 of reserving a room (T-60/T-61/T-62): day/time grid of 30-minute slots per bookable room (own building, a cross-building favorites list, or a "rooms near me" list), the booking flow and an optional "only free right now" filter. "My bookings" (check-in, cancel, directions) is a top-level section, `MyBookingsSection.tsx`. */
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { campusTimeToday, expandDemoSlots, isRoomFree, type BookableRoom } from "../../indoor/availability";
import { demoSlotPatterns } from "../../indoor/roomFinderDemo";
import type { AvailabilitySlot } from "../../indoor/types";
import { preferredRoomsService, type PreferredRoom } from "../../lib/preferredRooms";
import {
  CHECKIN_WINDOW_MINUTES, isReservationActive, MAX_DURATION_MINUTES,
  reservationBusyWindow, reservationsService, SLOT_MINUTES, type NewReservation, type Reservation,
} from "../../lib/reservations";
import { useAuth } from "../../state/auth";

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
 * Day/time grid, booking flow and favorites for any list of bookable rooms -- one building's rooms
 * (`RoomsBoard`'s building chip), a cross-building favorites list ("Favorites"), or a cross-building
 * distance-sorted list ("Rooms near me", T-61). All three pass the same `BookableRoom[]` shape
 * (`indoor/availability.ts#bookableRoomsFor` / `#favoriteRoomsFrom` / `#crossBuildingBookableRooms`),
 * so this component never needs to know which one it's showing. `onlyAvailable` (T-62, the board's
 * "Only available rooms" chip) narrows the rendered rooms to ones free *right now* -- the current
 * 30-minute slot on today's grid, regardless of which day tab happens to be selected -- reusing
 * {@link isRoomFree} rather than a second availability engine.
 */
export default function ReservationGrid({ rooms, onlyAvailable = false }: { rooms: BookableRoom[]; onlyAvailable?: boolean }) {
  const { session, requireAuth } = useAuth();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const bookableRooms = rooms;
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
  const [favorites, setFavorites] = useState<PreferredRoom[]>([]);
  const refresh = useCallback(() => {
    void Promise.all(bookableRooms.map(async (room) => [room.id, await reservationsService.listForRoom(room.id)] as const))
      .then((entries) => setReservationsByRoom(Object.fromEntries(entries)));
    if (session) void preferredRoomsService.list(session.accountId).then(setFavorites);
    else setFavorites([]);
  }, [bookableRooms, session]);
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

  // "Only available rooms" (T-62): today's slots and the current instant's slot index, always
  // anchored to day 0 (today) regardless of which day tab is selected -- "right now" doesn't change
  // when you flip to tomorrow's grid. Reuses expandDemoSlots/isRoomFree verbatim, no second engine.
  const todaySlots = useMemo(() => {
    const today = days[0];
    const tomorrow = new Date(today.getTime() + 86_400_000);
    return [...expandDemoSlots(demoSlotPatterns, today), ...expandDemoSlots(demoSlotPatterns, tomorrow), ...busyFromReservations];
  }, [days, busyFromReservations]);
  const nowSlotIndex = useMemo(() => boundaries[0].findIndex(
    (slot) => slot.start.getTime() <= now.getTime() && now.getTime() < slot.end.getTime(),
  ), [boundaries, now]);
  const visibleRooms = useMemo(() => {
    if (!onlyAvailable) return bookableRooms;
    if (nowSlotIndex < 0) return [];
    return bookableRooms.filter((room) => isRoomFree(room.id, todaySlots, boundaries[0][nowSlotIndex]));
  }, [onlyAvailable, bookableRooms, nowSlotIndex, todaySlots, boundaries]);

  function pickDay(index: number) {
    setSelectedDayIndex(index);
    setSelection(null);
    setError(null);
  }

  function onSlotClick(roomId: string, index: number) {
    if (didDragRef.current) { didDragRef.current = false; return; } // the click that follows a drag's pointerup; the drag already set the selection
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

  // Drag-to-select (mouse/pen): press a free slot, drag across adjacent free slots to extend the
  // selection continuously instead of tapping each one. Stops growing at the first busy/past cell
  // or at the 2-hour cap (MAX_SLOTS) in whichever direction the drag is heading -- same caps as the
  // tap-to-extend path in onSlotClick above, just applied live as the pointer moves.
  const dragAnchor = useRef<{ room: string; index: number } | null>(null);
  const didDragRef = useRef(false);
  useEffect(() => {
    const onUp = () => { dragAnchor.current = null; };
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, []);

  function onSlotPointerDown(roomId: string, index: number) {
    if (!cellFree(roomId, index) || cellPast(index)) return;
    dragAnchor.current = { room: roomId, index };
    didDragRef.current = false;
  }

  function onSlotPointerEnter(roomId: string, index: number, event: ReactPointerEvent<HTMLButtonElement>) {
    const anchor = dragAnchor.current;
    if (!anchor || anchor.room !== roomId || event.buttons !== 1) return;
    didDragRef.current = true;
    setError(null);
    setNotice(null);
    let startIndex: number;
    let endIndex: number;
    if (index >= anchor.index) {
      startIndex = anchor.index;
      endIndex = Math.min(index + 1, anchor.index + MAX_SLOTS);
      for (let i = anchor.index; i < endIndex; i++) { if (!cellFree(roomId, i) || cellPast(i)) { endIndex = i; break; } }
    } else {
      endIndex = anchor.index + 1;
      startIndex = Math.max(index, anchor.index + 1 - MAX_SLOTS);
      for (let i = anchor.index; i >= startIndex; i--) { if (!cellFree(roomId, i) || cellPast(i)) { startIndex = i + 1; break; } }
    }
    setSelection({ room: roomId, dayIndex: selectedDayIndex, startIndex, endIndex });
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
  const [pendingFavorite, setPendingFavorite] = useState<{ room: BookableRoom; next: boolean } | null>(null);

  // Resumes automatically once `session` appears, which is exactly how F-21's sign-in gate is
  // supposed to work ("the action continues where I left off") -- a closure captured at click time
  // would still hold the stale (signed-out) session, so the pending-then-effect handoff is load-bearing here.
  useEffect(() => {
    if (!pending || !session) return;
    const input = pending;
    setPending(null);
    setBooking(true);
    setError(null);
    void reservationsService.create(input, session.accountId)
      .then(() => { setSelection(null); setNotice(`Reserved. Check in within ${CHECKIN_WINDOW_MINUTES} minutes of the start time from "My bookings" above, or it releases automatically.`); setRefreshKey((k) => k + 1); })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Something went wrong saving on this device. Please try again."))
      .finally(() => setBooking(false));
  }, [pending, session]);
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
  const toggleFavorite = (room: BookableRoom) => requireAuth(() => setPendingFavorite({ room, next: !favoriteIds.has(room.id) }));

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
      ) : visibleRooms.length === 0 ? (
        <p className="cims-empty" role="status">
          {nowSlotIndex < 0
            ? `Outside today's displayed hours (${hourFmt.format(boundaries[0][0].start)}–${hourFmt.format(boundaries[0][boundaries[0].length - 1].end)}) -- can't tell what's free right now.`
            : "No rooms are free right now. Turn off “Only available rooms” to see the full list."}
        </p>
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
          {visibleRooms.map((room) => {
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
                    // On-the-hour slots (every other one, since cells are 30 min) show the hour as a
                    // compact in-circle label -- a quick visual anchor without labeling all 30 cells.
                    const onTheHour = index % 2 === 0;
                    const hour12 = onTheHour ? (((start.getHours() + 11) % 12) + 1) : null;
                    return (
                      <button key={index} type="button" className={slotClass(room.id, index, free, past)}
                        disabled={(!free || past || cappedNeighbor) && !selected}
                        aria-pressed={selected}
                        aria-label={`${room.label}, ${timeFmt.format(start)}, ${cappedNeighbor ? "2-hour maximum reached" : status}`}
                        title={cappedNeighbor ? "2-hour maximum reached" : undefined}
                        onPointerDown={() => onSlotPointerDown(room.id, index)}
                        onPointerEnter={(event) => onSlotPointerEnter(room.id, index, event)}
                        onClick={() => onSlotClick(room.id, index)}>
                        {hour12 !== null && <span className="reserve-slot__hour" aria-hidden="true">{hour12}</span>}
                      </button>
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
            (see "My bookings" above) or the room releases automatically for someone else.
          </p>
          {!session && <p className="cims-muted">Sign-in required to reserve &mdash; you'll be asked when you tap Reserve.</p>}
        </section>
      )}
    </div>
  );
}
