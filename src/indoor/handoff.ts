/** @file Hands off to the shell's existing reservations panel ("Book this room", "Go back to bookings") from anywhere else in the app. */
import { useSyncExternalStore } from "react";

/** A request to open the reservations panel: on one building/room ("Book this room"), or straight on "My bookings" ("Go back to bookings"). */
export type BookingRequest =
  | { kind: "room"; buildingId: string; roomId: string; seq: number }
  | { kind: "bookings"; seq: number };

let pending: BookingRequest | null = null;
let seq = 0;
const listeners = new Set<() => void>();

function publish(request: BookingRequest): void {
  pending = request;
  listeners.forEach((listener) => listener());
}

/** Asks the shell to open the reservations panel on this building (room id is "buildingId:spaceId"). */
export function requestBooking(buildingId: string, roomId: string): void {
  publish({ kind: "room", buildingId, roomId, seq: ++seq });
}

/** Asks the shell to open the reservations panel straight on "My bookings" -- the quick way back from a room card, a filed report, a place card, etc. */
export function requestBookingsView(): void {
  publish({ kind: "bookings", seq: ++seq });
}

/** The latest booking request, if one has not been handled yet. */
export function peekBookingRequest(): BookingRequest | null { return pending; }

/** Marks the booking request as handled, so opening the panel later starts at its building picker again. */
export function clearBookingRequest(): void { pending = null; }

/** Re-renders when a new booking request arrives; returns its sequence number (0 when none). */
export function useBookingRequestSeq(): number {
  return useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => seq);
}
