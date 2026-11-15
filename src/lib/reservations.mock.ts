/** @file Mock ReservationsService backed by localStorage. Prototype only: nothing leaves the browser, so bookings don't sync across devices. */
import { readLocal, writeLocal } from "./localStore";
import {
  isReservationActive, MAX_DURATION_MINUTES, MIN_DURATION_MINUTES, reservationBusyWindow, RENEWAL_WINDOW_MINUTES, SLOT_MINUTES,
  type NewReservation, type Reservation, type ReservationsService,
} from "./reservations";

const KEY = "cims.reservations.v1";
const OPEN_ENDED_START_SLACK_MS = 5 * 60_000; // how far in the past "now" is still allowed, to absorb render/network lag

function overlaps(a: { start: string; end: string }, b: { start: string; end: string }): boolean {
  return Date.parse(a.start) < Date.parse(b.end) && Date.parse(b.start) < Date.parse(a.end);
}

/** Creates the localStorage-backed mock. Falls back to memory when storage is unavailable. */
export function createLocalReservationsService(): ReservationsService {
  let memory: Reservation[] | null = null;
  const load = (): Reservation[] => memory ?? readLocal<Reservation[]>(KEY, []);
  const save = (reservations: Reservation[]) => {
    if (memory || !writeLocal(KEY, reservations)) memory = reservations;
  };
  const update = (id: string, change: (reservation: Reservation) => Reservation): Reservation => {
    const reservations = load();
    const index = reservations.findIndex((r) => r.id === id);
    if (index < 0) throw new Error("That reservation no longer exists on this device.");
    const next = change(reservations[index]);
    save(reservations.map((r, i) => (i === index ? next : r)));
    return next;
  };

  return {
    async create(input: NewReservation, accountId: string) {
      const now = new Date();
      const start = input.start;
      if (!Number.isFinite(start.getTime())) throw new Error("Pick a valid start time.");

      let end: Date;
      if (input.mode === "fixed") {
        if (!input.end) throw new Error("Pick an end time.");
        end = input.end;
        const minutes = (end.getTime() - start.getTime()) / 60_000;
        if (minutes % SLOT_MINUTES !== 0 || minutes < MIN_DURATION_MINUTES || minutes > MAX_DURATION_MINUTES) {
          throw new Error(`Fixed bookings run ${MIN_DURATION_MINUTES}-${MAX_DURATION_MINUTES} minutes, in ${SLOT_MINUTES}-minute steps.`);
        }
      } else {
        if (Math.abs(start.getTime() - now.getTime()) > OPEN_ENDED_START_SLACK_MS) {
          throw new Error("Open-ended bookings start now, from inside the room -- pick the current time slot.");
        }
        end = new Date(start.getTime() + RENEWAL_WINDOW_MINUTES * 60_000);
      }

      const proposed = { start: start.toISOString(), end: end.toISOString() };
      const clash = load()
        .filter((r) => r.room === input.room && isReservationActive(r, now))
        .some((r) => { const w = reservationBusyWindow(r); return w !== null && overlaps(proposed, w); });
      if (clash) throw new Error("Someone just booked part of that time. Pick another slot.");

      const reservation: Reservation = {
        id: `RES-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase(),
        room: input.room,
        buildingId: input.buildingId,
        roomLabel: input.roomLabel,
        mode: input.mode,
        start: proposed.start,
        end: input.mode === "fixed" ? proposed.end : null,
        lastRenewedAt: input.mode === "open-ended" ? proposed.start : null,
        accountId,
        createdAt: now.toISOString(),
        cancelledAt: null,
      };
      save([...load(), reservation]);
      return reservation;
    },

    async cancel(id: string, accountId: string) {
      return update(id, (r) => {
        if (r.accountId !== accountId) throw new Error("Only the person who booked this room can cancel it.");
        return r.cancelledAt ? r : { ...r, cancelledAt: new Date().toISOString() };
      });
    },

    async renew(id: string, accountId: string) {
      const now = new Date();
      return update(id, (r) => {
        if (r.accountId !== accountId) throw new Error("Only the person who booked this room can renew it.");
        if (r.mode !== "open-ended") throw new Error("Only open-ended bookings need renewing.");
        if (!isReservationActive(r, now)) throw new Error("This booking already lapsed and the room was released. Book it again.");
        return { ...r, lastRenewedAt: now.toISOString() };
      });
    },

    async listForRoom(room: string) {
      return load().filter((r) => r.room === room);
    },

    async listMine(accountId: string) {
      return load()
        .filter((r) => r.accountId === accountId && !r.cancelledAt)
        .sort((a, b) => Date.parse(b.start) - Date.parse(a.start));
    },
  };
}
