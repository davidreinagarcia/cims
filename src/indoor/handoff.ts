/** @file Hands a room from the indoor screen to the shell's existing reservations panel ("Book this room"). */
import { useSyncExternalStore } from "react";

/** A request to open the reservations panel on one building, coming from an indoor room card. */
export interface BookingRequest { buildingId: string; roomId: string; seq: number }

let pending: BookingRequest | null = null;
let seq = 0;
const listeners = new Set<() => void>();

/** Asks the shell to open the reservations panel on this building (room id is "buildingId:spaceId"). */
export function requestBooking(buildingId: string, roomId: string): void {
  pending = { buildingId, roomId, seq: ++seq };
  listeners.forEach((listener) => listener());
}

/** The latest booking request, if one has not been handled yet. */
export function peekBookingRequest(): BookingRequest | null { return pending; }

/** Marks the booking request as handled, so opening the panel later starts at its building picker again. */
export function clearBookingRequest(): void { pending = null; }

/** Re-renders when a new booking request arrives; returns its sequence number (0 when none). */
export function useBookingRequestSeq(): number {
  return useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => seq);
}
