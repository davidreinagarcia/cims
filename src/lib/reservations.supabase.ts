/** @file ReservationsService on Supabase: booking, overlap, cooldown and check-in rules run server-side (RPCs); falls back to the local mock only when the backend is unreachable. */
import type { NewReservation, Reservation, ReservationsService } from "./reservations";
import { accountId, rest, withFallback } from "./supabase";

interface Row {
  id: string; account_id: string; room: string; building_id: string; room_label: string;
  start_at: string; end_at: string; checked_in_at: string | null; cancelled_at: string | null; created_at: string;
}
const iso = (v: string | null) => (v ? new Date(v).toISOString() : null);
const toReservation = (r: Row): Reservation => ({
  id: r.id, room: r.room, buildingId: r.building_id, roomLabel: r.room_label,
  start: new Date(r.start_at).toISOString(), end: new Date(r.end_at).toISOString(),
  checkedInAt: iso(r.checked_in_at), accountId: r.account_id, createdAt: new Date(r.created_at).toISOString(), cancelledAt: iso(r.cancelled_at),
});

/** Shared reservations; the caller's `accountId` argument is ignored because ownership is the Supabase user (auth.uid()). */
export function createSupabaseReservationsService(fallback: ReservationsService): ReservationsService {
  const rpc = (fn: string, body: object) => rest<Row>(`rpc/${fn}`, { method: "POST", body }).then(toReservation);
  return {
    create: (input: NewReservation, uid) => withFallback(() => rpc("book_room", {
      p_room: input.room, p_building_id: input.buildingId, p_label: input.roomLabel,
      p_start: input.start.toISOString(), p_end: input.end.toISOString(),
    }), () => fallback.create(input, uid)),
    cancel: (id, uid) => withFallback(() => rpc("cancel_reservation", { p_id: id }), () => fallback.cancel(id, uid)),
    checkIn: (id, uid) => withFallback(() => rpc("check_in_reservation", { p_id: id }), () => fallback.checkIn(id, uid)),
    listForRoom: (room) => withFallback(async () =>
      (await rest<Row[]>(`reservations?select=*&room=eq.${encodeURIComponent(room)}&cancelled_at=is.null`)).map(toReservation),
      () => fallback.listForRoom(room)),
    listMine: (uid) => withFallback(async () =>
      (await rest<Row[]>(`reservations?select=*&account_id=eq.${await accountId()}&cancelled_at=is.null&order=start_at.desc`)).map(toReservation),
      () => fallback.listMine(uid)),
  };
}
