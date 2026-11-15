/** @file Room reservation contracts (T-60/T-61/F-20) and the one place that picks the backend adapter. Kendeda + CULC only. */
import type { AvailabilitySlot } from "../indoor/types";
import { createLocalReservationsService } from "./reservations.mock";
import { createSupabaseReservationsService } from "./reservations.supabase";

/** 30 minutes: both the grid's cell size and the minimum booking length. */
export const SLOT_MINUTES = 30;
/** Shortest a reservation may be. */
export const MIN_DURATION_MINUTES = 30;
/** Longest a reservation may be; the grid must not let a selection grow past this. */
export const MAX_DURATION_MINUTES = 120;
/**
 * Every reservation (T-61, replacing T-60's manually-tapped "Renew" button) has this many minutes
 * from its start to check in from inside/near the room before it is treated as a no-show and
 * auto-released. Matches the sign-in-dialog-free "just works" feel the rest of this prototype goes
 * for: long enough to walk over from a nearby class, short enough that a genuine no-show frees the
 * room quickly for someone else (PRD P3: "No-shows can also leave high-demand rooms unused").
 */
export const CHECKIN_WINDOW_MINUTES = 15;
/**
 * How close (in meters) a check-in's GPS fix must be to the room's *building* centroid
 * (`src/data/buildings.geojson` via `lib/buildings.ts`) to count as a successful check-in. There is
 * no indoor positioning hardware, so this is necessarily building-level, not room-level -- the UI
 * says so plainly. 150 m is a few times a typical consumer-GPS accuracy radius (commonly 10-50 m,
 * worse indoors/near tall buildings), so an honest check-in from just inside or just outside the
 * building's footprint still passes, while a check-in attempted from across campus still fails.
 */
export const CHECKIN_RADIUS_METERS = 150;
/** How many minutes before a checked-in reservation's end the UI shows an in-app "ending soon" reminder (honest banner only -- no OS push backend exists, so this is never attempted as a real notification). */
export const END_REMINDER_MINUTES = 10;
/**
 * Anti-camping cooldown (T-61, explicitly requested): once an account's reservation on a room ends
 * -- whether it ran its full booked course or was cut short by the no-show release above -- that
 * same account can't immediately rebook that exact room. One slot length (30 min, {@link SLOT_MINUTES})
 * is long enough to break a "release and instantly re-grab" loop without meaningfully hurting anyone
 * who just wants the room again later. Booking a *different* room, or the *same* room after the
 * cooldown, is unaffected. A reservation the account itself cancelled does not start this cooldown --
 * that is a deliberate, immediate choice to free the room, not the no-show/overstay pattern this
 * rule targets.
 */
export const REBOOK_COOLDOWN_MINUTES = SLOT_MINUTES;

/** A booked room as the UI sees it. Always a fixed start/end; "open-ended + Renew" (T-60) is gone, replaced by the check-in model above. */
export interface Reservation {
  id: string;
  /** Selection id ("buildingId:spaceId"), matching `indoor/registry.ts#indoorRooms()`. */
  room: string;
  buildingId: string;
  /** Display name captured at booking time, so history reads fine without re-resolving the registry. */
  roomLabel: string;
  /** ISO 8601 instant. */
  start: string;
  /** ISO 8601 instant. */
  end: string;
  /** ISO 8601 instant of a successful location check-in, or null before one happens (or if it never does and the room auto-releases). */
  checkedInAt: string | null;
  accountId: string;
  createdAt: string;
  /** ISO 8601 instant the booker cancelled, or null while active/auto-released. */
  cancelledAt: string | null;
}

/** What the booking flow submits; the service assigns id, timestamps and ownership. */
export interface NewReservation {
  room: string;
  buildingId: string;
  roomLabel: string;
  /** Must be 30-120 minutes after `start`, in 30-minute steps. */
  start: Date;
  end: Date;
}

/** Backend contract for reservations. Implemented by the localStorage mock today (ADR-0005 still open). */
export interface ReservationsService {
  /** Books a room; throws with a human-readable message if the input is invalid, the room is no longer free, or the account's anti-camping cooldown on this room hasn't elapsed. */
  create(input: NewReservation, accountId: string): Promise<Reservation>;
  /** Cancels a reservation the caller owns; releasing it immediately. No-op if already cancelled. */
  cancel(id: string, accountId: string): Promise<Reservation>;
  /** Confirms the caller's presence (already location-verified by the caller -- see `CHECKIN_RADIUS_METERS` and `panels/rooms/ReservationGrid.tsx`) within the {@link CHECKIN_WINDOW_MINUTES} window; throws if it's not the caller's, already lapsed, or cancelled. A second call after a successful check-in is a no-op. */
  checkIn(id: string, accountId: string): Promise<Reservation>;
  /** Every non-cancelled reservation for one room, for computing the day grid's busy slots. */
  listForRoom(room: string): Promise<Reservation[]>;
  /** This account's non-cancelled reservations across every building, newest first -- the caller filters by room for the "My reservations" panel (works the same whether that's one building or a cross-building favorites/nearby list). */
  listMine(accountId: string): Promise<Reservation[]>;
}

/** The instant a reservation's check-in window closes; past this with no check-in, the room is a no-show and frees itself. */
export function checkinDeadline(reservation: Reservation): Date {
  return new Date(Date.parse(reservation.start) + CHECKIN_WINDOW_MINUTES * 60_000);
}

/**
 * The interval a reservation blocks on its room: its whole booked range, or null once cancelled.
 * Whether it still counts is decided by {@link isReservationActive} (a booking nobody checks in to
 * stops counting once its check-in window closes, so the room frees itself with no timer or cleanup job).
 */
export function reservationBusyWindow(reservation: Reservation): AvailabilitySlot | null {
  if (reservation.cancelledAt) return null;
  return { room: reservation.room, start: reservation.start, end: reservation.end };
}

/** Whether a reservation is still occupying its room at `now`: not cancelled, not past its end, and either checked in or still inside its check-in window (a no-show is released). */
export function isReservationActive(reservation: Reservation, now: Date): boolean {
  if (reservation.cancelledAt) return false;
  if (now.getTime() >= Date.parse(reservation.end)) return false;
  return reservation.checkedInAt !== null || now.getTime() < checkinDeadline(reservation).getTime();
}

/** Where one reservation stands right now, for the "My reservations here" UI -- derived purely from timestamps, same spirit as {@link reservationBusyWindow}. */
export type ReservationStatus = "pending-checkin" | "checked-in" | "ending-soon" | "no-show-released" | "ended" | "cancelled";

/** Classifies a reservation's current status for display; see {@link ReservationStatus}. */
export function reservationStatus(reservation: Reservation, now: Date): ReservationStatus {
  if (reservation.cancelledAt) return "cancelled";
  const nowMs = now.getTime();
  if (!reservation.checkedInAt) {
    return nowMs < checkinDeadline(reservation).getTime() ? "pending-checkin" : "no-show-released";
  }
  const endMs = Date.parse(reservation.end);
  if (nowMs >= endMs) return "ended";
  return nowMs >= endMs - END_REMINDER_MINUTES * 60_000 ? "ending-soon" : "checked-in";
}

/** The reservations backend used by the app. Supabase, with the local mock as offline fallback. */
export const reservationsService: ReservationsService = createSupabaseReservationsService(createLocalReservationsService());
