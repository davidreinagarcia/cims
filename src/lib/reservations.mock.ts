/** @file Mock ReservationsService backed by localStorage. Prototype only: nothing leaves the browser, so bookings and check-in state don't sync across devices. */
import { readLocal, writeLocal } from "./localStore";
import {
  checkinDeadline, isReservationActive, MAX_DURATION_MINUTES, MIN_DURATION_MINUTES, REBOOK_COOLDOWN_MINUTES,
  reservationBusyWindow, SLOT_MINUTES, type NewReservation, type Reservation, type ReservationsService,
} from "./reservations";

const KEY = "cims.reservations.v1";
const CHECKIN_EARLY_SLACK_MS = 5 * 60_000; // a check-in just before the reservation's start still counts, to absorb render/network lag

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
      const end = input.end;
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) throw new Error("Pick a valid start and end time.");

      const minutes = (end.getTime() - start.getTime()) / 60_000;
      if (minutes % SLOT_MINUTES !== 0 || minutes < MIN_DURATION_MINUTES || minutes > MAX_DURATION_MINUTES) {
        throw new Error(`Bookings run ${MIN_DURATION_MINUTES}-${MAX_DURATION_MINUTES} minutes, in ${SLOT_MINUTES}-minute steps.`);
      }

      const proposed = { start: start.toISOString(), end: end.toISOString() };
      const roomReservations = load().filter((r) => r.room === input.room);

      const clash = roomReservations
        .filter((r) => isReservationActive(r, now))
        .some((r) => { const w = reservationBusyWindow(r); return w !== null && overlaps(proposed, w); });
      if (clash) throw new Error("Someone just booked part of that time. Pick another slot.");

      // Anti-camping (T-61): this account can't immediately rebook the exact same room right after
      // one of its own (non-cancelled) reservations there ends -- whether that reservation ran its
      // full course or was cut short by the no-show release. A cancelled reservation doesn't count:
      // cancelling is a deliberate "I'm giving this up now", not the overstay/re-grab pattern this
      // guards against. Other accounts' reservations don't trigger this account's cooldown.
      const cooldownEndsAt = roomReservations
        .filter((r) => r.accountId === accountId && !r.cancelledAt)
        .reduce((latest, r) => Math.max(latest, Date.parse(r.checkedInAt ? r.end : checkinDeadline(r).toISOString()) + REBOOK_COOLDOWN_MINUTES * 60_000), -Infinity);
      if (start.getTime() < cooldownEndsAt) {
        throw new Error(`You just had this room -- wait ${REBOOK_COOLDOWN_MINUTES} minutes after a reservation ends before booking it again, or book a different room.`);
      }

      const reservation: Reservation = {
        id: `RES-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase(),
        room: input.room,
        buildingId: input.buildingId,
        roomLabel: input.roomLabel,
        start: proposed.start,
        end: proposed.end,
        checkedInAt: null,
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

    async checkIn(id: string, accountId: string) {
      const now = new Date();
      return update(id, (r) => {
        if (r.accountId !== accountId) throw new Error("Only the person who booked this room can check in.");
        if (r.cancelledAt) throw new Error("This reservation was cancelled.");
        if (r.checkedInAt) return r; // already checked in -- no-op, not an error
        if (now.getTime() >= checkinDeadline(r).getTime()) {
          throw new Error("The 15-minute check-in window already closed and this room was released. Book it again.");
        }
        if (now.getTime() < Date.parse(r.start) - CHECKIN_EARLY_SLACK_MS) throw new Error("You can check in once your reservation starts.");
        return { ...r, checkedInAt: now.toISOString() };
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
