/** @file "My bookings" (T-62): a top-level section of the full-page Rooms board listing every one of the signed-in account's reservations across both buildings, with a richer card (schematic glyph, capacity, time window) and five actions -- show on map, check in, external directions, guide inside the building and report an issue. */
import { useEffect, useMemo, useState } from "react";
import { indoorFor, resolveRoom } from "../../indoor/registry";
import { roomAmenitiesById } from "../../indoor/roomFinderDemo";
import { loadBuildings, loadedBuildings, type BuildingIndex } from "../../lib/buildings";
import {
  CHECKIN_RADIUS_METERS, CHECKIN_WINDOW_MINUTES, checkInNearby, checkinDeadline, REBOOK_COOLDOWN_MINUTES,
  reservationsService, reservationStatus, type Reservation,
} from "../../lib/reservations";
import { useAuth } from "../../state/auth";
import { useSelection } from "../../state/selection";
import BuildingGlyph from "./BuildingGlyph";

const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit", hour12: true });
const dayFmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric" });

/** Builds the "room number/name · building · floor" header straight from the real indoor registry -- never the booking-time label alone, since that's formatted differently depending on which screen the booking was made from (own-building vs. a cross-building favorites/near-me list). */
function headerLine(reservation: Reservation): string {
  const resolved = resolveRoom(reservation.room);
  const building = indoorFor(reservation.buildingId)?.title ?? reservation.buildingId;
  const roomName = resolved?.routable
    ? (resolved.space.room ? `Room ${resolved.space.room}` : resolved.space.name)
    : reservation.roomLabel;
  const floor = resolved?.level?.label;
  return [roomName, building, floor].filter(Boolean).join(" · ");
}

/** One richer booking card: header, schematic glyph, capacity + time window, status and the five actions. */
function BookingCard({ reservation, now, buildings, onError, onNotice, onChanged }: {
  reservation: Reservation; now: Date; buildings: BuildingIndex | null;
  onError: (message: string) => void; onNotice: (message: string) => void; onChanged: () => void;
}) {
  const { session, requireAuth } = useAuth();
  const { select } = useSelection();
  // Not booleans: `requireAuth`'s stored action (while the sign-in dialog is open) is a closure
  // created before sign-in finishes, so it would still capture the old (signed-out) `session`. The
  // same pending-then-effect handoff `ReservationGrid.tsx` uses -- the action below only flips a flag;
  // a separate effect, re-run on every render, does the actual call with whatever `session` is current
  // once both the flag and the session are set.
  const [pendingCheckIn, setPendingCheckIn] = useState(false);
  const [pendingCancel, setPendingCancel] = useState(false);
  const [busy, setBusy] = useState<"checkin" | "cancel" | null>(null);
  const status = reservationStatus(reservation, now);
  const deadline = checkinDeadline(reservation);
  const capacity = roomAmenitiesById.get(reservation.room)?.capacity;
  const center = buildings?.byId.get(reservation.buildingId)?.center;
  const directionsUrl = center ? `https://www.google.com/maps/dir/?api=1&destination=${center[1]},${center[0]}` : undefined;

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

  useEffect(() => {
    if (!pendingCheckIn || !session) return;
    setPendingCheckIn(false);
    setBusy("checkin");
    void checkInNearby(reservation, session.accountId)
      .then(() => { onNotice("Checked in -- enjoy the room."); onChanged(); })
      .catch((err: unknown) => onError(err instanceof Error ? err.message : "Something went wrong getting your location. Please try again."))
      .finally(() => setBusy(null));
  }, [pendingCheckIn, session]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!pendingCancel || !session) return;
    setPendingCancel(false);
    setBusy("cancel");
    void reservationsService.cancel(reservation.id, session.accountId)
      .then(() => { onNotice("Reservation cancelled."); onChanged(); })
      .catch((err: unknown) => onError(err instanceof Error ? err.message : "Something went wrong. Please try again."))
      .finally(() => setBusy(null));
  }, [pendingCancel, session]); // eslint-disable-line react-hooks/exhaustive-deps

  const doCheckIn = () => requireAuth(() => setPendingCheckIn(true));
  const doCancel = () => requireAuth(() => setPendingCancel(true));

  return (
    <li className="booking-card">
      <BuildingGlyph buildingId={reservation.buildingId} />
      <div className="booking-card__body">
        <strong className="booking-card__title">{headerLine(reservation)}</strong>
        <span className="cims-mono cims-muted">
          {capacity !== undefined && <>Up to {capacity} &middot; </>}
          {dayFmt.format(new Date(reservation.start))}, {timeFmt.format(new Date(reservation.start))}–{timeFmt.format(new Date(reservation.end))}
        </span>
        <span className={status === "pending-checkin" || status === "ending-soon" ? "reserve-mine__reminder" : "cims-muted"}>
          {statusLine[status]}
        </span>
        {(status === "no-show-released" || status === "ended") && <span className="cims-tag">{status === "no-show-released" ? "Released" : "Ended"}</span>}
        <div className="cims-actions booking-card__actions">
          <button type="button" className="cims-btn cims-btn--small" onClick={() => select({ kind: "building", id: reservation.buildingId })}>Show on map</button>
          {canCheckIn && (
            <button type="button" className="cims-btn cims-btn--small cims-btn--primary" disabled={busy === "checkin"} onClick={doCheckIn}>
              {busy === "checkin" ? "Checking in…" : "Check in"}
            </button>
          )}
          {directionsUrl && (
            <a className="cims-btn cims-btn--small" href={directionsUrl} target="_blank" rel="noopener noreferrer">Directions</a>
          )}
          <button type="button" className="cims-btn cims-btn--small" onClick={() => select({ kind: "room", id: reservation.room })}>Guide inside building</button>
          <button type="button" className="cims-btn cims-btn--small" onClick={() => requireAuth(() => select({ kind: "report", id: reservation.buildingId }))}>Report</button>
          {canCancel && (
            <button type="button" className="cims-btn cims-btn--small" disabled={busy === "cancel"} onClick={doCancel}>Cancel</button>
          )}
        </div>
      </div>
    </li>
  );
}

/** Top-level "My bookings": every non-cancelled reservation the signed-in account holds, across Kendeda and CULC. */
export default function MyBookingsSection({ onCountChange }: { onCountChange?: (count: number) => void }) {
  const { session } = useAuth();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [buildings, setBuildings] = useState<BuildingIndex | null>(loadedBuildings);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (buildings) return;
    let alive = true;
    void loadBuildings().then((index) => { if (alive) setBuildings(index); }).catch(() => { /* directions just won't resolve yet */ });
    return () => { alive = false; };
  }, [buildings]);

  useEffect(() => {
    if (!session) { setReservations([]); return; }
    let alive = true;
    void reservationsService.listMine(session.accountId).then((mine) => { if (alive) setReservations(mine); });
    return () => { alive = false; };
  }, [session, refreshKey]);

  useEffect(() => { onCountChange?.(reservations.length); }, [reservations.length, onCountChange]);

  const sorted = useMemo(() => [...reservations].sort((a, b) => Date.parse(a.start) - Date.parse(b.start)), [reservations]);
  const onChanged = () => setRefreshKey((k) => k + 1);

  return (
    <section className="booking-list" aria-label="My bookings">
      {!session && <p className="cims-muted">Sign in to see and manage your bookings.</p>}
      {session && sorted.length === 0 && <p className="cims-empty" role="status">No bookings yet.</p>}
      {error && <p className="reserve-grid__error" role="alert"><strong>Error:</strong> {error}</p>}
      {notice && <p className="cims-muted" role="status">{notice}</p>}
      {sorted.length > 0 && (
        <ul className="booking-list__items">
          {sorted.map((reservation) => (
            <BookingCard key={reservation.id} reservation={reservation} now={now} buildings={buildings}
              onError={setError} onNotice={setNotice} onChanged={onChanged} />
          ))}
        </ul>
      )}
      <p className="cims-muted booking-list__prototype">
        <span className="cims-tag cims-tag--alert">Prototype</span> Check-in confirms you're within about {CHECKIN_RADIUS_METERS} m
        of the <em>building</em> using this device's location -- there's no indoor positioning, so it can't confirm you're in the
        room itself. No check-in within {CHECKIN_WINDOW_MINUTES} minutes of the start releases the room automatically for someone
        else. After a reservation ends, this account can't immediately rebook the same room for {REBOOK_COOLDOWN_MINUTES} minutes
        (a different room is fine right away). Bookings and check-in state live only on this device/browser.
      </p>
    </section>
  );
}
