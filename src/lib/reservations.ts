/** @file Room reservation contracts (T-60/F-20) and the one place that picks the backend adapter. Kendeda + CULC only. */
import type { AvailabilitySlot } from "../indoor/types";
import { createLocalReservationsService } from "./reservations.mock";

/** 30 minutes: both the grid's cell size and the minimum booking length. */
export const SLOT_MINUTES = 30;
/** Shortest a fixed-time reservation may be. */
export const MIN_DURATION_MINUTES = 30;
/** Longest a fixed-time reservation may be; the grid must not let a selection grow past this. */
export const MAX_DURATION_MINUTES = 120;
/**
 * Prototype stand-in for occupancy check-in (no QR/NFC/geofencing exists yet -- see PRD F-18
 * "No-show release", T-40). An open-ended booking stays "busy" only up to `lastRenewedAt` (or
 * `start`, before the first renewal) plus this many minutes; the Renew button bumps the window
 * forward. Missing a renewal lets the slot flip back to free on its own, with no polling needed:
 * {@link reservationBusyWindow} already encodes the deadline as the slot's `end`.
 */
export const RENEWAL_WINDOW_MINUTES = 30;

/** How a reservation ends: at a fixed time, or kept alive by renewing until released. */
export type ReservationMode = "fixed" | "open-ended";

/** A booked room as the UI sees it. */
export interface Reservation {
  id: string;
  /** Selection id ("buildingId:spaceId"), matching `indoor/registry.ts#indoorRooms()`. */
  room: string;
  buildingId: string;
  /** Display name captured at booking time, so history reads fine without re-resolving the registry. */
  roomLabel: string;
  mode: ReservationMode;
  /** ISO 8601 instant. */
  start: string;
  /** ISO 8601 instant; set only when `mode` is "fixed". */
  end: string | null;
  /** ISO 8601 instant of the last Renew tap; set only when `mode` is "open-ended". */
  lastRenewedAt: string | null;
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
  mode: ReservationMode;
  /** Start instant. For "open-ended", must be close to now -- this is a "renew from the room" prototype, not a future hold. */
  start: Date;
  /** Required and only used when `mode` is "fixed"; must be 30-120 minutes after `start` in 30-minute steps. */
  end?: Date;
}

/** Backend contract for reservations. Implemented by the localStorage mock today (ADR-0005 still open). */
export interface ReservationsService {
  /** Books a room; throws with a human-readable message if the input is invalid or the room is no longer free. */
  create(input: NewReservation, accountId: string): Promise<Reservation>;
  /** Cancels a reservation the caller owns; releasing it immediately. No-op if already cancelled. */
  cancel(id: string, accountId: string): Promise<Reservation>;
  /** Keeps an open-ended reservation alive for another {@link RENEWAL_WINDOW_MINUTES}; throws if it already lapsed or isn't the caller's. */
  renew(id: string, accountId: string): Promise<Reservation>;
  /** Every non-cancelled reservation for one room, for computing the day grid's busy slots. */
  listForRoom(room: string): Promise<Reservation[]>;
  /** This account's non-cancelled reservations in one building, for the "My reservations" panel. */
  listMineForBuilding(buildingId: string, accountId: string): Promise<Reservation[]>;
}

/** Whether a reservation is still occupying its room at `now` (not cancelled, not past its end/renewal deadline). */
export function isReservationActive(reservation: Reservation, now: Date): boolean {
  if (reservation.cancelledAt) return false;
  const window = reservationBusyWindow(reservation);
  return window !== null && now.getTime() < Date.parse(window.end);
}

/**
 * The interval a reservation currently blocks on its room, for {@link isRoomFree}/{@link findFreeRooms}
 * (see `indoor/availability.ts`). A fixed reservation blocks exactly its booked range. An open-ended
 * one blocks only up to its last renewal plus the grace window -- an honest stand-in for presence
 * verification we don't have (T-40's eventual QR/NFC check-in does the real thing). Returns null once cancelled.
 */
export function reservationBusyWindow(reservation: Reservation): AvailabilitySlot | null {
  if (reservation.cancelledAt) return null;
  if (reservation.mode === "fixed") {
    return reservation.end ? { room: reservation.room, start: reservation.start, end: reservation.end } : null;
  }
  const last = reservation.lastRenewedAt ?? reservation.start;
  const end = new Date(Date.parse(last) + RENEWAL_WINDOW_MINUTES * 60_000).toISOString();
  return { room: reservation.room, start: reservation.start, end };
}

/** The reservations backend used by the app. Swap the adapter here (and only here) when ADR-0005 is decided. */
export const reservationsService: ReservationsService = createLocalReservationsService();
